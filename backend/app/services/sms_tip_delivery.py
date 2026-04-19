"""
Helpers for admin-managed automatic SMS delivery of published tips.
"""

import asyncio
import logging
import re
import uuid
from datetime import datetime, timedelta, UTC

import httpx
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.setting import AdminSetting
from app.models.sms_tip import SmsTipQueue
from app.models.subscription import SubscriptionTier
from app.models.tip import Tip
from app.models.user import User
from app.services.subscription_access import sync_user_subscription_summary, user_has_category_access

logger = logging.getLogger(__name__)

SMS_PROVIDER_URL = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"


def _normalize_phone_digits(phone: str) -> str:
    digits = re.sub(r"[\D]", "", phone or "")
    if digits.startswith("0") and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith("7") and len(digits) == 9:
        return f"254{digits}"
    return digits


def _user_has_tip_access(user: User, tip: Tip, tiers: list[SubscriptionTier]) -> bool:
    if not user.sms_tips_enabled or not user.is_active or not user.phone:
        return False
    sync_user_subscription_summary(user)
    return user_has_category_access(user, tip.category, tiers)


async def _get_sms_settings(db) -> dict:
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(["SMS_SRC", "SMS_ENABLED"])))
    rows = {row.key: row.value for row in result.scalars().all()}
    return {
        "SMS_SRC": rows.get("SMS_SRC", "ARVOCAP"),
        "SMS_ENABLED": rows.get("SMS_ENABLED", "true").lower() == "true",
    }


def _ensure_magic_login_token(user: User) -> bool:
    if user.magic_login_token:
        return False
    user.magic_login_token = uuid.uuid4().hex[:32]
    return True


def _build_magic_login_link(user: User) -> str:
    base_url = settings.FRONTEND_URL.rstrip("/")
    return f"{base_url}/welcome?t={user.magic_login_token}"


def _format_tip_bundle_message(user: User, tips: list[Tip]) -> str:
    lines = [f"TambuaTips {user.subscription_tier.title()} Tips"]
    for index, tip in enumerate(sorted(tips, key=lambda t: (t.match_date, t.id)), start=1):
        lines.extend([
            f"{index}. {tip.home_team} vs {tip.away_team}",
            f"Tip: {tip.prediction}",
            f"Category: {tip.category.upper()}",
        ])
    lines.append(f"Link: {_build_magic_login_link(user)}")
    return "\n".join(lines)


async def _send_sms(phone: str, message: str, sms_src: str) -> None:
    stripped_phone = _normalize_phone_digits(phone)
    if not stripped_phone:
        raise ValueError("Phone number is empty after normalization")
    params = {
        "src": sms_src,
        "phone_number": stripped_phone,
        "sms_message": message,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(SMS_PROVIDER_URL, params=params)
        response.raise_for_status()


async def _deliver_pending_sms_tip_bundle(
    db,
    *,
    user_id: int,
    only_tip_ids: list[int] | None = None,
) -> bool:
    user_result = await db.execute(
        select(User)
        .options(selectinload(User.subscription_entitlement_rows))
        .where(User.id == user_id)
    )
    user = user_result.scalar_one_or_none()

    queue_stmt = (
        select(SmsTipQueue)
        .where(
            SmsTipQueue.user_id == user_id,
            SmsTipQueue.status == "pending",
        )
        .order_by(SmsTipQueue.created_at.asc())
    )
    if only_tip_ids:
        queue_stmt = queue_stmt.where(SmsTipQueue.tip_id.in_(only_tip_ids))
    queue_items = (await db.execute(queue_stmt)).scalars().all()
    if not queue_items:
        return False

    if not user:
        for item in queue_items:
            item.status = "failed"
            item.error = "User not found"
        await db.commit()
        return False

    sms_settings = await _get_sms_settings(db)
    if not sms_settings["SMS_ENABLED"]:
        for item in queue_items:
            item.status = "failed"
            item.error = "SMS delivery disabled"
        await db.commit()
        return False

    tier_result = await db.execute(select(SubscriptionTier))
    tiers = tier_result.scalars().all()

    tip_ids = [item.tip_id for item in queue_items]
    tip_result = await db.execute(select(Tip).where(Tip.id.in_(tip_ids)))
    tips_by_id = {tip.id: tip for tip in tip_result.scalars().all()}
    eligible_tips = [
        tips_by_id[item.tip_id]
        for item in queue_items
        if item.tip_id in tips_by_id and _user_has_tip_access(user, tips_by_id[item.tip_id], tiers)
    ]

    if not eligible_tips:
        for item in queue_items:
            item.status = "failed"
            item.error = "No longer eligible for queued tips"
        await db.commit()
        return False

    _ensure_magic_login_token(user)
    message = _format_tip_bundle_message(user, eligible_tips)

    try:
        await _send_sms(user.phone or "", message, sms_settings["SMS_SRC"])
        for item in queue_items:
            await db.delete(item)
        await db.commit()
        return True
    except Exception as exc:  # pragma: no cover - network/provider path
        logger.error("Failed to send bundled tip SMS to user %s: %s", user_id, exc)
        for item in queue_items:
            item.status = "failed"
            item.error = str(exc)
        await db.commit()
        return False


async def process_sms_tip_bundle_after_delay(user_id: int, scheduled_for: datetime) -> None:
    delay = (scheduled_for - datetime.now(UTC).replace(tzinfo=None)).total_seconds()
    if delay > 0:
        await asyncio.sleep(delay)

    async with AsyncSessionLocal() as db:
        await _deliver_pending_sms_tip_bundle(db, user_id=user_id)


async def flush_pending_sms_tip_bundles(*, tip_ids: list[int] | None = None) -> dict[str, int]:
    async with AsyncSessionLocal() as db:
        user_stmt = select(SmsTipQueue.user_id).where(SmsTipQueue.status == "pending")
        if tip_ids:
            user_stmt = user_stmt.where(SmsTipQueue.tip_id.in_(tip_ids))
        user_ids = sorted(set((await db.execute(user_stmt)).scalars().all()))

    if not user_ids:
        return {"users_processed": 0, "users_sent": 0}

    users_sent = 0
    for user_id in user_ids:
        async with AsyncSessionLocal() as db:
            sent = await _deliver_pending_sms_tip_bundle(db, user_id=user_id)
            users_sent += int(sent)

    return {
        "users_processed": len(user_ids),
        "users_sent": users_sent,
    }


async def queue_tip_sms_for_tip(tip_id: int) -> None:
    async with AsyncSessionLocal() as db:
        tip_result = await db.execute(select(Tip).where(Tip.id == tip_id))
        tip = tip_result.scalar_one_or_none()
        if not tip:
            return

        tier_result = await db.execute(select(SubscriptionTier))
        tiers = tier_result.scalars().all()

        user_result = await db.execute(
            select(User)
            .options(selectinload(User.subscription_entitlement_rows))
            .where(
                User.sms_tips_enabled == True,
                User.phone.is_not(None),
                User.is_active == True,
            )
        )
        users = user_result.scalars().all()

        now = datetime.now(UTC).replace(tzinfo=None)

        for user in users:
            if not _user_has_tip_access(user, tip, tiers):
                continue

            pending_result = await db.execute(
                select(SmsTipQueue)
                .where(SmsTipQueue.user_id == user.id, SmsTipQueue.status == "pending")
                .order_by(SmsTipQueue.dispatch_scheduled_for.asc())
                .limit(1)
            )
            pending_item = pending_result.scalar_one_or_none()
            dispatch_at = pending_item.dispatch_scheduled_for if pending_item else now

            existing_result = await db.execute(
                select(SmsTipQueue.id).where(SmsTipQueue.user_id == user.id, SmsTipQueue.tip_id == tip.id)
            )
            if existing_result.scalar_one_or_none():
                continue

            db.add(
                SmsTipQueue(
                    user_id=user.id,
                    tip_id=tip.id,
                    status="pending",
                    dispatch_scheduled_for=dispatch_at,
                )
            )

            if _ensure_magic_login_token(user):
                db.add(user)

        await db.commit()
