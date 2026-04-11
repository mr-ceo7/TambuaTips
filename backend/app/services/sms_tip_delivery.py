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

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.setting import AdminSetting
from app.models.sms_tip import SmsTipQueue
from app.models.subscription import SubscriptionTier
from app.models.tip import Tip
from app.models.user import User

logger = logging.getLogger(__name__)

BUNDLE_WINDOW_SECONDS = 60
SMS_PROVIDER_URL = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"


def _normalize_phone_digits(phone: str) -> str:
    return re.sub(r"[\D]", "", phone or "")


def _tier_categories_map(tiers: list[SubscriptionTier]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for tier in tiers:
        if isinstance(tier.categories, list):
            out[tier.tier_id] = tier.categories
        else:
            out[tier.tier_id] = []
    return out


def _user_has_tip_access(user: User, tip: Tip, tier_categories: dict[str, list[str]]) -> bool:
    if not user.sms_tips_enabled or not user.is_active or not user.phone:
        return False
    if not user.is_subscription_active:
        return False
    if user.is_admin or user.subscription_tier == "premium":
        return True
    return tip.category in tier_categories.get(user.subscription_tier or "", [])


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
            f"Odds: {tip.odds}",
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


async def process_sms_tip_bundle_after_delay(user_id: int, scheduled_for: datetime) -> None:
    delay = (scheduled_for - datetime.now(UTC).replace(tzinfo=None)).total_seconds()
    if delay > 0:
        await asyncio.sleep(delay)

    async with AsyncSessionLocal() as db:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        queue_result = await db.execute(
            select(SmsTipQueue)
            .where(
                SmsTipQueue.user_id == user_id,
                SmsTipQueue.status == "pending",
                SmsTipQueue.dispatch_scheduled_for <= scheduled_for,
            )
            .order_by(SmsTipQueue.created_at.asc())
        )
        queue_items = queue_result.scalars().all()
        if not queue_items:
            return

        if not user:
            for item in queue_items:
                item.status = "failed"
                item.error = "User not found"
            await db.commit()
            return

        sms_settings = await _get_sms_settings(db)
        if not sms_settings["SMS_ENABLED"]:
            for item in queue_items:
                item.status = "failed"
                item.error = "SMS delivery disabled"
            await db.commit()
            return

        tier_result = await db.execute(select(SubscriptionTier))
        tier_categories = _tier_categories_map(tier_result.scalars().all())

        tip_ids = [item.tip_id for item in queue_items]
        tip_result = await db.execute(select(Tip).where(Tip.id.in_(tip_ids)))
        tips_by_id = {tip.id: tip for tip in tip_result.scalars().all()}
        eligible_tips = [tips_by_id[item.tip_id] for item in queue_items if item.tip_id in tips_by_id and _user_has_tip_access(user, tips_by_id[item.tip_id], tier_categories)]

        if not eligible_tips:
            for item in queue_items:
                item.status = "failed"
                item.error = "No longer eligible for queued tips"
            await db.commit()
            return

        _ensure_magic_login_token(user)
        message = _format_tip_bundle_message(user, eligible_tips)

        try:
            await _send_sms(user.phone or "", message, sms_settings["SMS_SRC"])
            sent_at = datetime.now(UTC).replace(tzinfo=None)
            for item in queue_items:
                item.status = "sent"
                item.sent_at = sent_at
                item.error = None
            await db.commit()
        except Exception as exc:  # pragma: no cover - network/provider path
            logger.error("Failed to send bundled tip SMS to user %s: %s", user_id, exc)
            for item in queue_items:
                item.status = "failed"
                item.error = str(exc)
            await db.commit()


async def queue_tip_sms_for_tip(tip_id: int) -> None:
    async with AsyncSessionLocal() as db:
        tip_result = await db.execute(select(Tip).where(Tip.id == tip_id))
        tip = tip_result.scalar_one_or_none()
        if not tip:
            return

        tier_result = await db.execute(select(SubscriptionTier))
        tiers = tier_result.scalars().all()
        tier_categories = _tier_categories_map(tiers)

        user_result = await db.execute(
            select(User).where(
                User.sms_tips_enabled == True,
                User.phone.is_not(None),
                User.is_active == True,
                User.subscription_tier != "free",
            )
        )
        users = user_result.scalars().all()

        now = datetime.now(UTC).replace(tzinfo=None)
        scheduled_tasks: list[tuple[int, datetime]] = []

        for user in users:
            if not _user_has_tip_access(user, tip, tier_categories):
                continue

            pending_result = await db.execute(
                select(SmsTipQueue)
                .where(SmsTipQueue.user_id == user.id, SmsTipQueue.status == "pending")
                .order_by(SmsTipQueue.dispatch_scheduled_for.asc())
                .limit(1)
            )
            pending_item = pending_result.scalar_one_or_none()
            dispatch_at = pending_item.dispatch_scheduled_for if pending_item else now + timedelta(seconds=BUNDLE_WINDOW_SECONDS)

            existing_result = await db.execute(
                select(SmsTipQueue.id).where(SmsTipQueue.user_id == user.id, SmsTipQueue.tip_id == tip.id)
            )
            if existing_result.scalar_one_or_none():
                continue

            if pending_item is None or dispatch_at <= now:
                scheduled_tasks.append((user.id, dispatch_at))

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

        for user_id, dispatch_at in scheduled_tasks:
            asyncio.create_task(process_sms_tip_bundle_after_delay(user_id, dispatch_at))
