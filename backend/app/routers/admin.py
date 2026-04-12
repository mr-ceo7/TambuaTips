"""
Admin routes — privileged operations + analytics dashboard.
"""

import csv
import io
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta, UTC
import uuid

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete, update, or_, case

from app.dependencies import get_db, require_admin
from app.models.user import User
from app.models.affiliate import (
    Affiliate, AffiliateClick, AffiliateConversion,
    AffiliatePayout, AffiliateCommissionConfig,
)
from app.schemas.affiliate import (
    AffiliateResponse, AffiliateStatusUpdate, AffiliateAdminAssign,
    CommissionConfigResponse, CommissionConfigUpdate, PayoutRequest,
)
from app.models.payment import Payment
from app.models.tip import Tip
from app.models.jackpot import Jackpot, JackpotPurchase
from app.models.legacy_mpesa import LegacyMpesaTransaction
from app.models.subscription import SubscriptionTier
from app.models.activity import UserActivity, AnonymousVisitor
from app.models.ad import AdPost
from app.models.setting import AdminSetting
from app.schemas.auth import UserResponse, AdminUserResponse
from app.schemas.payment import PaymentResponse
from app.schemas.ad import AdPostCreate, AdPostUpdate, AdPostResponse
from app.services.email_service import send_broadcast_email, send_affiliate_approved_email
from app.services.legacy_mpesa_sync import (
    fetch_latest_legacy_mpesa_records,
    fetch_legacy_mpesa_records,
    fetch_legacy_mpesa_records_before,
    fetch_legacy_mpesa_records_between,
    ensure_phone_user,
    normalize_phone,
    sync_legacy_mpesa_transactions,
)
from app.config import settings

import re
import httpx
import logging as _logging

router = APIRouter(prefix="/api/admin", tags=["Admin"])


async def _get_sms_settings(db: AsyncSession) -> dict:
    """Fetch SMS settings from admin settings table."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.like("SMS_%")))
    rows = result.scalars().all()
    return {r.key: r.value for r in rows}


async def _notify_affiliate_approved(phone: str, name: str, db: AsyncSession):
    """Send SMS to an affiliate when their account is approved."""
    try:
        sms_settings = await _get_sms_settings(db)
        sms_enabled = sms_settings.get("SMS_ENABLED", "true").lower() == "true"
        if not sms_enabled:
            return

        sms_src = sms_settings.get("SMS_SRC", "ARVOCAP")
        stripped_phone = _normalize_phone_digits_for_sms(phone)

        sms_message = (
            f"Hi {name}! Great news - your TambuaTips Affiliate account has been approved! "
            f"You can now start earning commissions. Log in at affiliate.tambuatips.com to get your referral link."
        )

        sms_url = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"
        params = {"src": sms_src, "phone_number": stripped_phone, "sms_message": sms_message}

        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(sms_url, params=params)
            if response.status_code == 200:
                _logging.info(f"Approval SMS sent to {stripped_phone}")
            else:
                _logging.warning(f"SMS provider returned {response.status_code} for {stripped_phone}")
    except Exception as e:
        _logging.error(f"Failed to send approval SMS to {phone}: {e}")


def _normalize_phone(phone: str) -> str:
    return normalize_phone(phone)


def _normalize_phone_digits_for_sms(phone: str) -> str:
    digits = re.sub(r'[\D]', '', phone or '')
    if digits.startswith('0') and len(digits) == 10:
        return f"254{digits[1:]}"
    if digits.startswith('7') and len(digits) == 9:
        return f"254{digits}"
    return digits


def _ensure_referral_code(user: User):
    if user.referral_code:
        return
    safe_name = "".join([c for c in user.name if c.isalpha()])[:3].upper()
    if len(safe_name) < 3:
        safe_name = "VIP"
    user.referral_code = f"{safe_name}{uuid.uuid4().hex[:5].upper()}"


def _ensure_magic_login_token(user: User):
    if not user.magic_login_token:
        user.magic_login_token = uuid.uuid4().hex[:32]


def _grant_subscription_access(user: User, tier: str, duration_days: int) -> None:
    if tier == "free":
        user.subscription_tier = "free"
        user.subscription_expires_at = None
        return

    now = datetime.now(UTC).replace(tzinfo=None)
    current_expiry = user.subscription_expires_at if user.subscription_expires_at and user.subscription_expires_at > now else now
    user.subscription_tier = tier
    user.subscription_expires_at = current_expiry + timedelta(days=duration_days)


def _create_subscription_payment(
    *,
    user: User,
    amount_paid: float,
    tier: str,
    duration_days: int,
    admin_id: int,
    source: str,
    reference: str | None = None,
    transaction_id: str | None = None,
    extra_metadata: Optional[dict] = None,
) -> Payment:
    metadata = {
        "source": source,
        "duration_days": duration_days,
        "admin_id": admin_id,
    }
    if extra_metadata:
        metadata.update(extra_metadata)

    return Payment(
        user_id=user.id,
        amount=amount_paid,
        currency="KES",
        method="mpesa",
        status="completed",
        reference=reference or f"{source.upper()}-{uuid.uuid4().hex[:10].upper()}",
        transaction_id=transaction_id or f"{source.upper()}-{uuid.uuid4().hex[:10].upper()}",
        item_type="subscription",
        item_id=tier,
        phone=user.phone,
        email=user.email,
        gateway_response=json.dumps(metadata),
    )


async def _assign_legacy_queue_item(
    db: AsyncSession,
    *,
    queue_item: LegacyMpesaTransaction,
    tier: str,
    duration_days: int,
    admin_id: int,
) -> tuple[User, Payment]:
    user = None
    if queue_item.user_id:
        user_res = await db.execute(select(User).where(User.id == queue_item.user_id))
        user = user_res.scalar_one_or_none()

    if not user:
        user, _ = await ensure_phone_user(
            db,
            queue_item.phone,
            first_name=queue_item.first_name,
            other_name=queue_item.other_name,
        )

    _ensure_referral_code(user)
    _ensure_magic_login_token(user)
    user.sms_tips_enabled = True
    user.is_active = True
    _grant_subscription_access(user, tier, duration_days)
    db.add(user)
    await db.flush()

    payment = _create_subscription_payment(
        user=user,
        amount_paid=queue_item.amount,
        tier=tier,
        duration_days=duration_days,
        admin_id=admin_id,
        source="legacy_mpesa_assignment",
        reference=f"LEGACY-MPESA-{queue_item.source_record_id}",
        transaction_id=f"LEGACY-MPESA-{queue_item.source_record_id}",
        extra_metadata={
            "legacy_transaction_id": queue_item.source_record_id,
            "legacy_queue_id": queue_item.id,
            "biz_no": queue_item.biz_no,
        },
    )
    db.add(payment)
    await db.flush()

    queue_item.user_id = user.id
    queue_item.payment_id = payment.id
    queue_item.onboarding_status = "assigned"
    queue_item.assigned_tier = tier
    queue_item.assigned_duration_days = duration_days
    queue_item.assigned_at = datetime.now(UTC).replace(tzinfo=None)
    db.add(queue_item)

    return user, payment



# ═══════════════════════════════════════════════════════════════
#  SETTINGS — Referral Economics Configuration
# ═══════════════════════════════════════════════════════════════

# Default referral settings (used when no AdminSetting row exists yet)
REFERRAL_DEFAULTS = {
    "referral_enabled": "true",
    "points_per_tip": "2",
    "points_per_discount": "5",
    "discount_percentage": "50",
    "points_per_premium": "10",
    "premium_days_reward": "7",
    "referral_new_user_reward": "false",
    "referral_new_user_reward_tier": "basic",
    "referral_new_user_reward_days": "7",
    "jackpot_midweek_price": "500",
    "jackpot_mega_price": "1000",
    "jackpot_midweek_int_price": "5",
    "jackpot_mega_int_price": "10",
    "jackpot_history_retention_days": "30",
    "jackpot_bundle_discount": "20",
    "jackpot_prices_json": "{}",
}

REFERRAL_DESCRIPTIONS = {
    "referral_enabled": "Master toggle for the referral system",
    "points_per_tip": "Points required to unlock a single locked tip",
    "points_per_discount": "Points required to generate a payment discount",
    "discount_percentage": "Percentage discount applied to standard price when discount is redeemed",
    "points_per_premium": "Points required to redeem free premium access",
    "premium_days_reward": "Days of premium access granted on premium redemption",
    "referral_new_user_reward": "Whether the new user also gets rewarded on sign-up",
    "referral_new_user_reward_tier": "Subscription tier granted to the new user",
    "referral_new_user_reward_days": "Days of access granted to the new user",
    "jackpot_midweek_price": "Default price for Midweek Jackpot in local currency (KES)",
    "jackpot_mega_price": "Default price for Mega Jackpot in local currency (KES)",
    "jackpot_midweek_int_price": "Default price for Midweek Jackpot in international currency (USD)",
    "jackpot_mega_int_price": "Default price for Mega Jackpot in international currency (USD)",
    "jackpot_history_retention_days": "Number of days to keep jackpots visible in the history",
    "jackpot_bundle_discount": "Percentage discount offered when purchasing all available jackpots together (0-100)",
    "jackpot_prices_json": "JSON configuration for overriding default prices based on specific DC levels (e.g. 3DC, 4DC)",
}

async def get_referral_settings(db: AsyncSession) -> dict:
    """Helper to read all referral settings as a typed dict."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(REFERRAL_DEFAULTS.keys())))
    settings_db = {s.key: s.value for s in result.scalars().all()}
    out = {}
    for key, default in REFERRAL_DEFAULTS.items():
        raw = settings_db.get(key, default)
        # Type coerce based on default
        if default in ("true", "false"):
            out[key] = raw.lower() == "true"
        elif default.isdigit():
            out[key] = int(raw) if raw.isdigit() else int(default)
        else:
            out[key] = raw
    return out


class SettingsUpdateProps(BaseModel):
    referral_enabled: Optional[bool] = None
    points_per_tip: Optional[int] = None
    points_per_discount: Optional[int] = None
    discount_percentage: Optional[int] = None
    points_per_premium: Optional[int] = None
    premium_days_reward: Optional[int] = None
    referral_new_user_reward: Optional[bool] = None
    referral_new_user_reward_tier: Optional[str] = None
    referral_new_user_reward_days: Optional[int] = None
    jackpot_midweek_price: Optional[int] = None
    jackpot_mega_price: Optional[int] = None
    jackpot_midweek_int_price: Optional[int] = None
    jackpot_mega_int_price: Optional[int] = None
    jackpot_history_retention_days: Optional[int] = None
    jackpot_bundle_discount: Optional[int] = None
    jackpot_prices_json: Optional[str] = None


@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    return await get_referral_settings(db)


@router.put("/settings")
async def update_settings(body: SettingsUpdateProps, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        # Serialize booleans as "true"/"false", ints as strings
        str_value = str(value).lower() if isinstance(value, bool) else str(value)
        res = await db.execute(select(AdminSetting).where(AdminSetting.key == key))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = AdminSetting(key=key, value=str_value, description=REFERRAL_DESCRIPTIONS.get(key, ""))
            db.add(setting)
        else:
            setting.value = str_value
    await db.commit()
    return await get_referral_settings(db)




# ═══════════════════════════════════════════════════════════════
#  SMS SETTINGS — OTP Configuration
# ═══════════════════════════════════════════════════════════════

SMS_DEFAULTS = {
    "SMS_SRC": "ARVOCAP",
    "SMS_ENABLED": "true",
    "SMS_TEMPLATE": "[TambuaTips] Your verification code is {code}. This code expires in 5 minutes. Do NOT share this code with anyone. Visit {url} to access your account."
}

SMS_DESCRIPTIONS = {
    "SMS_SRC": "SMS Provider Sender ID (from Trackomgroup)",
    "SMS_ENABLED": "Enable/disable SMS OTP feature",
    "SMS_TEMPLATE": "The template for the SMS message. Variables {code} and {url} will be replaced."
}


class SMSSettingsUpdate(BaseModel):
    SMS_SRC: Optional[str] = None
    SMS_ENABLED: Optional[bool] = None
    SMS_TEMPLATE: Optional[str] = None


EMAIL_DEFAULTS = {
    "SMTP_EMAIL": "",
    "SMTP_PASSWORD": ""
}

EMAIL_DESCRIPTIONS = {
    "SMTP_EMAIL": "The email address or username used to log into the SMTP server (e.g. Gmail).",
    "SMTP_PASSWORD": "The app password generated for the email account."
}

class EmailSettingsUpdate(BaseModel):
    SMTP_EMAIL: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None


async def get_sms_settings(db: AsyncSession) -> dict:
    """Helper to read all SMS settings as a typed dict."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(SMS_DEFAULTS.keys())))
    settings_db = {s.key: s.value for s in result.scalars().all()}
    out = {}
    for key, default in SMS_DEFAULTS.items():
        raw = settings_db.get(key, default)
        # Type coerce based on default
        if default in ("true", "false"):
            out[key] = raw.lower() == "true"
        else:
            out[key] = raw
    return out


async def get_email_settings(db: AsyncSession) -> dict:
    """Helper to read all Email settings as a typed dict."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(EMAIL_DEFAULTS.keys())))
    settings_db = {s.key: s.value for s in result.scalars().all()}
    out = {}
    for key, default in EMAIL_DEFAULTS.items():
        out[key] = settings_db.get(key, default)
    return out


@router.get("/settings/sms")
async def get_sms_settings_endpoint(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Get current SMS settings."""
    return await get_sms_settings(db)


@router.put("/settings/sms")
async def update_sms_settings(body: SMSSettingsUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Update SMS settings."""
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        # Serialize booleans as "true"/"false", strings as-is
        str_value = str(value).lower() if isinstance(value, bool) else str(value)
        res = await db.execute(select(AdminSetting).where(AdminSetting.key == key))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = AdminSetting(key=key, value=str_value, description=SMS_DESCRIPTIONS.get(key, ""))
            db.add(setting)
        else:
            setting.value = str_value
    await db.commit()
    return {"message": "SMS settings updated successfully"}


@router.get("/settings/email")
async def get_email_settings_endpoint(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Get current Email settings."""
    return await get_email_settings(db)


@router.put("/settings/email")
async def update_email_settings(body: EmailSettingsUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Update Email settings."""
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        str_value = str(value)
        res = await db.execute(select(AdminSetting).where(AdminSetting.key == key))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = AdminSetting(key=key, value=str_value, description=EMAIL_DESCRIPTIONS.get(key, ""))
            db.add(setting)
        else:
            setting.value = str_value
    await db.commit()
    return {"message": "Email settings updated successfully"}


# ═══════════════════════════════════════════════════════════════
#  SUPPORT CONTACT SETTINGS
# ═══════════════════════════════════════════════════════════════

SUPPORT_DEFAULTS = {
    "SUPPORT_EMAIL": "tambuatips@gmail.com",
    "SUPPORT_WHATSAPP": "https://wa.me/254746957502",
    "SUPPORT_WHATSAPP_NUMBER": "+254 746 957 502",
}

SUPPORT_DESCRIPTIONS = {
    "SUPPORT_EMAIL": "Public support email address shown on the contact page and help widget.",
    "SUPPORT_WHATSAPP": "Full WhatsApp link (https://wa.me/...) for the support chat button.",
    "SUPPORT_WHATSAPP_NUMBER": "Display-formatted WhatsApp number for user reference.",
}


class SupportSettingsUpdate(BaseModel):
    SUPPORT_EMAIL: Optional[str] = None
    SUPPORT_WHATSAPP: Optional[str] = None
    SUPPORT_WHATSAPP_NUMBER: Optional[str] = None


async def get_support_settings(db: AsyncSession) -> dict:
    """Helper to read all support contact settings."""
    result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(SUPPORT_DEFAULTS.keys())))
    settings_db = {s.key: s.value for s in result.scalars().all()}
    out = {}
    for key, default in SUPPORT_DEFAULTS.items():
        out[key] = settings_db.get(key, default)
    return out


@router.get("/settings/support")
async def get_support_settings_endpoint(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Admin: Get current support contact settings."""
    return await get_support_settings(db)


@router.put("/settings/support")
async def update_support_settings(body: SupportSettingsUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Admin: Update support contact settings."""
    updates = body.model_dump(exclude_none=True)
    for key, value in updates.items():
        str_value = str(value)
        res = await db.execute(select(AdminSetting).where(AdminSetting.key == key))
        setting = res.scalar_one_or_none()
        if not setting:
            setting = AdminSetting(key=key, value=str_value, description=SUPPORT_DESCRIPTIONS.get(key, ""))
            db.add(setting)
        else:
            setting.value = str_value
    await db.commit()
    return {"message": "Support settings updated successfully"}

# ═══════════════════════════════════════════════════════════════
#  REFERRAL ANALYTICS
# ═══════════════════════════════════════════════════════════════

@router.get("/referral-stats")
async def referral_stats(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Aggregated referral analytics for the admin panel."""
    # Total referrals made across platform
    total_res = await db.execute(select(func.sum(User.referrals_count)))
    total_referrals = total_res.scalar() or 0

    # Top 10 referrers
    top_res = await db.execute(
        select(User.id, User.name, User.email, User.referrals_count, User.referral_code)
        .where(User.referrals_count > 0)
        .order_by(User.referrals_count.desc())
        .limit(10)
    )
    top_referrers = [
        {
            "id": row.id,
            "name": row.name,
            "email": row.email,
            "referrals_count": row.referrals_count,
            "referral_code": row.referral_code,
        }
        for row in top_res.all()
    ]

    # Users acquired via referrals (have a referrer_id set)
    referred_users_res = await db.execute(
        select(func.count(User.id)).where(User.referrer_id != None)
    )
    referred_users_count = referred_users_res.scalar() or 0

    # Aggregate array fields
    all_users_res = await db.execute(select(User.unlocked_tip_ids, User.referral_discount_active))
    total_tips_unlocked = 0
    pending_discounts = 0
    for unlocked, discount_active in all_users_res.all():
        if unlocked:
            total_tips_unlocked += len(unlocked)
        if discount_active:
            pending_discounts += 1

    # Current settings
    ref_settings = await get_referral_settings(db)

    return {
        "total_referrals": total_referrals,
        "referred_users": referred_users_count,
        "total_tips_unlocked": total_tips_unlocked,
        "total_discounts_claimed": pending_discounts,
        "top_referrers": top_referrers,
        "settings": ref_settings,
    }


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════

@router.delete("/dashboard/clear")
async def clear_dashboard_stats(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """DANGEROUS: Wipes all tracking stats, payments, and resets user subscriptions."""
    try:
        # Wipe visitors & activity
        await db.execute(delete(UserActivity))
        await db.execute(delete(AnonymousVisitor))
        
        # Wipe payment history and purchases
        await db.execute(delete(JackpotPurchase))
        await db.execute(delete(Payment))
        
        # Reset all registered users back to free tier
        await db.execute(
            update(User)
            .where(User.subscription_tier != "free")
            .values(subscription_tier="free", subscription_expires_at=None)
        )
        
        await db.commit()
        return {"status": "success", "message": "All stats cleared and users reset to free tier."}
    except Exception as e:
        if settings.DEBUG:
            import traceback
            error_details = traceback.format_exc()
            raise HTTPException(status_code=500, detail=f"Failed: {str(e)}\n\n{error_details}")
        raise HTTPException(status_code=500, detail="Failed to clear dashboard stats. Internal Server Error.")

@router.get("/dashboard")
async def dashboard_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to track history"),
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    """Aggregated dashboard stats for the admin overview."""
    now = datetime.now(UTC).replace(tzinfo=None)
    three_min_ago = now - timedelta(minutes=3)

    # ── User Stats ─────────────────────────────────────────
    user_result = await db.execute(select(User))
    all_users = user_result.scalars().all()

    total_users = len(all_users)
    online_users = sum(1 for u in all_users if u.last_seen and u.last_seen > three_min_ago)

    visitor_res = await db.execute(select(AnonymousVisitor))
    all_visitors = visitor_res.scalars().all()
    
    total_guests = len(all_visitors)
    online_guests = sum(1 for v in all_visitors if v.last_seen and v.last_seen > three_min_ago)

    # Today's signups
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_registered = sum(1 for u in all_users if u.created_at and u.created_at >= today_start)
    today_guests = sum(1 for v in all_visitors if v.first_seen and v.first_seen >= today_start)

    # Subscribers by tier
    tier_counts = {}
    active_subscribers = 0
    for u in all_users:
        tier = u.subscription_tier or "free"
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
        if u.is_subscription_active:
            active_subscribers += 1

    conversion_rate = round((active_subscribers / total_users * 100), 1) if total_users > 0 else 0

    # User growth — signups per day for selected timeframe
    target_date = now - timedelta(days=days)
    growth_result = await db.execute(
        select(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("count")
        )
        .where(User.created_at >= target_date)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
    )
    is_yearly = days >= 365
    if is_yearly:
        date_list = []
        for i in range(11, -1, -1):
            m = now.month - i
            y = now.year
            while m <= 0:
                m += 12
                y -= 1
            date_list.append(f"{y}-{m:02d}")
    else:
        date_list = [str((now - timedelta(days=d)).date()) for d in range(days-1, -1, -1)]

    # Aggregate User Growth
    user_growth_map = {}
    for row in growth_result.all():
        key = str(row.day)[:7] if is_yearly else str(row.day)
        user_growth_map[key] = user_growth_map.get(key, 0) + row.count
        
    user_growth = [{"date": d, "count": user_growth_map.get(d, 0)} for d in date_list]

    # ── Revenue Stats ──────────────────────────────────────
    completed_payments = await db.execute(
        select(Payment).where(Payment.status == "completed")
    )
    all_payments = completed_payments.scalars().all()

    total_revenue = sum(p.amount for p in all_payments)

    # Revenue by method
    revenue_by_method = {}
    for p in all_payments:
        method = p.method or "unknown"
        revenue_by_method[method] = revenue_by_method.get(method, 0) + p.amount

    # Revenue by period
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)
    year_start = today_start.replace(month=1, day=1)

    revenue_today = sum(p.amount for p in all_payments if p.created_at and p.created_at >= today_start)
    revenue_week = sum(p.amount for p in all_payments if p.created_at and p.created_at >= week_start)
    revenue_month = sum(p.amount for p in all_payments if p.created_at and p.created_at >= month_start)
    revenue_year = sum(p.amount for p in all_payments if p.created_at and p.created_at >= year_start)

    # Revenue trend — per day for selected timeframe
    revenue_trend_result = await db.execute(
        select(
            func.date(Payment.created_at).label("day"),
            func.sum(Payment.amount).label("total")
        )
        .where(and_(Payment.status == "completed", Payment.created_at >= target_date))
        .group_by(func.date(Payment.created_at))
        .order_by(func.date(Payment.created_at))
    )
    # Aggregate Revenue Trend
    revenue_trend_map = {}
    for row in revenue_trend_result.all():
        key = str(row.day)[:7] if is_yearly else str(row.day)
        revenue_trend_map[key] = revenue_trend_map.get(key, 0) + int(row.total)
        
    revenue_trend = [{"date": d, "amount": revenue_trend_map.get(d, 0)} for d in date_list]

    # ── Tip Stats ──────────────────────────────────────────
    tip_result = await db.execute(select(Tip))
    all_tips = tip_result.scalars().all()

    tips_total = len(all_tips)
    tips_won = sum(1 for t in all_tips if t.result == "won")
    tips_lost = sum(1 for t in all_tips if t.result == "lost")
    tips_pending = sum(1 for t in all_tips if t.result == "pending")
    tips_voided = sum(1 for t in all_tips if t.result == "void")
    decided = tips_won + tips_lost
    win_rate = round((tips_won / decided * 100), 1) if decided > 0 else 0

    # ── Page Analytics ─────────────────────────────────────
    top_pages_result = await db.execute(
        select(
            UserActivity.path,
            func.count(UserActivity.id).label("visits"),
            func.sum(UserActivity.time_spent_seconds).label("total_time")
        )
        .group_by(UserActivity.path)
        .order_by(func.sum(UserActivity.time_spent_seconds).desc())
        .limit(10)
    )
    top_pages = [
        {"path": row.path, "visits": row.visits, "total_time": int(row.total_time)}
        for row in top_pages_result.all()
    ]

    # ── Recent Activity Feed ───────────────────────────────
    # Combine recent signups + recent payments
    recent_signups_result = await db.execute(
        select(User.id, User.name, User.email, User.created_at)
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_payments_result = await db.execute(
        select(Payment.id, Payment.amount, Payment.method, Payment.status, Payment.item_type, Payment.created_at, Payment.user_id)
        .order_by(Payment.created_at.desc())
        .limit(10)
    )

    activity_feed = []
    for row in recent_signups_result.all():
        activity_feed.append({
            "type": "signup",
            "user_name": row.name,
            "user_email": row.email,
            "timestamp": row.created_at.isoformat() if row.created_at else None,
        })
    for row in recent_payments_result.all():
        # Look up user name
        user_res = await db.execute(select(User.name, User.email).where(User.id == row.user_id))
        user_info = user_res.first()
        activity_feed.append({
            "type": "payment",
            "user_name": user_info.name if user_info else "Unknown",
            "user_email": user_info.email if user_info else "",
            "amount": row.amount,
            "method": row.method,
            "status": row.status,
            "item_type": row.item_type,
            "timestamp": row.created_at.isoformat() if row.created_at else None,
        })

    # Sort feed by timestamp desc
    activity_feed.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    activity_feed = activity_feed[:20]

    # ── Jackpot Stats ──────────────────────────────────────
    jackpot_count_res = await db.execute(select(func.count(Jackpot.id)))
    total_jackpots = jackpot_count_res.scalar() or 0

    jackpot_purchases_res = await db.execute(select(func.count(JackpotPurchase.id)))
    total_jackpot_purchases = jackpot_purchases_res.scalar() or 0

    return {
        "users": {
            "total_registered": total_users,
            "total_guests": total_guests,
            "today_registered": today_registered,
            "today_guests": today_guests,
            "online_registered": online_users,
            "online_guests": online_guests,
            "subscribers_by_tier": tier_counts,
            "active_subscribers": active_subscribers,
            "conversion_rate": conversion_rate,
            "growth": user_growth,
        },
        "revenue": {
            "total": total_revenue,
            "by_method": revenue_by_method,
            "today": revenue_today,
            "this_week": revenue_week,
            "this_month": revenue_month,
            "this_year": revenue_year,
            "trend": revenue_trend,
        },
        "tips": {
            "total": tips_total,
            "won": tips_won,
            "lost": tips_lost,
            "pending": tips_pending,
            "voided": tips_voided,
            "win_rate": win_rate,
        },
        "pages": top_pages,
        "activity_feed": activity_feed,
        "jackpots": {
            "total": total_jackpots,
            "total_purchases": total_jackpot_purchases,
        },
    }


# ═══════════════════════════════════════════════════════════════
#  TRANSACTION HISTORY WITH FILTERING
# ═══════════════════════════════════════════════════════════════

@router.get("/transactions")
async def list_transactions(
    status: Optional[str] = Query(None, description="Filter by status: pending, completed, failed, refunded"),
    method: Optional[str] = Query(None, description="Filter by payment method"),
    item_type: Optional[str] = Query(None, description="Filter by item type: subscription, jackpot"),
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search by user email or reference"),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Paginated, filterable transaction history."""
    query = select(Payment)
    count_query = select(func.count(Payment.id))

    filters = []

    if status:
        filters.append(Payment.status == status)
    if method:
        filters.append(Payment.method == method)
    if item_type:
        filters.append(Payment.item_type == item_type)
    if date_from:
        try:
            dt_from = datetime.strptime(date_from, "%Y-%m-%d")
            filters.append(Payment.created_at >= dt_from)
        except ValueError:
            pass
    if date_to:
        try:
            dt_to = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            filters.append(Payment.created_at < dt_to)
        except ValueError:
            pass
    if search:
        # Search by email or reference — need to join User
        search_lower = f"%{search.lower()}%"
        # We'll filter after fetching for now due to join complexity
        pass

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated data
    offset = (page - 1) * per_page
    query = query.order_by(Payment.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(query)
    payments = result.scalars().all()

    # Enrich with user info
    enriched = []
    for p in payments:
        user_res = await db.execute(select(User.name, User.email).where(User.id == p.user_id))
        user_info = user_res.first()

        # If searching by email/reference, filter here
        if search:
            search_lower = search.lower()
            match = False
            if user_info and search_lower in (user_info.email or "").lower():
                match = True
            if search_lower in (p.reference or "").lower():
                match = True
            if search_lower in (p.transaction_id or "").lower():
                match = True
            if not match:
                continue

        enriched.append({
            "id": p.id,
            "user_id": p.user_id,
            "user_name": user_info.name if user_info else "Unknown",
            "user_email": user_info.email if user_info else "",
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "status": p.status,
            "reference": p.reference,
            "transaction_id": p.transaction_id,
            "item_type": p.item_type,
            "item_id": p.item_id,
            "phone": p.phone,
            "email": p.email,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {
        "transactions": enriched,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════
#  TRANSACTION CSV EXPORT
# ═══════════════════════════════════════════════════════════════

@router.get("/transactions/export")
async def export_transactions(
    status: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    item_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    token: Optional[str] = Query(None, description="JWT token for direct browser downloads"),
    db: AsyncSession = Depends(get_db),
):
    """Export filtered transactions as CSV.
    
    Accepts auth via query param ?token=... since browser downloads
    (window.open) cannot set Authorization headers.
    """
    # Manual auth — accept token from query param
    from app.security import decode_token
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    admin_res = await db.execute(select(User).where(User.id == int(user_id)))
    admin = admin_res.scalar_one_or_none()
    if not admin or not admin.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    query = select(Payment)
    filters = []

    if status:
        filters.append(Payment.status == status)
    if method:
        filters.append(Payment.method == method)
    if item_type:
        filters.append(Payment.item_type == item_type)
    if date_from:
        try:
            filters.append(Payment.created_at >= datetime.strptime(date_from, "%Y-%m-%d"))
        except ValueError:
            pass
    if date_to:
        try:
            filters.append(Payment.created_at < datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1))
        except ValueError:
            pass

    if filters:
        query = query.where(and_(*filters))

    query = query.order_by(Payment.created_at.desc())
    result = await db.execute(query)
    payments = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Date", "User Email", "Amount", "Currency", "Method", "Status", "Reference", "Item Type", "Item ID"])

    for p in payments:
        user_res = await db.execute(select(User.email).where(User.id == p.user_id))
        user_email = user_res.scalar() or ""
        writer.writerow([
            p.id,
            p.created_at.isoformat() if p.created_at else "",
            user_email,
            p.amount,
            p.currency,
            p.method,
            p.status,
            p.reference or "",
            p.item_type,
            p.item_id or "",
        ])

    output.seek(0)
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=tambuatips_transactions_{datetime.now(UTC).replace(tzinfo=None).strftime('%Y%m%d')}.csv"}
    )


# ═══════════════════════════════════════════════════════════════
#  PER-USER ACTIVITY
# ═══════════════════════════════════════════════════════════════

@router.get("/users/{user_id}/activity")
async def user_activity_detail(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Detailed activity breakdown for a specific user."""
    # Check user exists
    user_res = await db.execute(select(User).where(User.id == user_id))
    u = user_res.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Page activity breakdown
    activity_res = await db.execute(
        select(
            UserActivity.path,
            func.count(UserActivity.id).label("visits"),
            func.sum(UserActivity.time_spent_seconds).label("total_time")
        )
        .where(UserActivity.user_id == user_id)
        .group_by(UserActivity.path)
        .order_by(func.sum(UserActivity.time_spent_seconds).desc())
    )
    pages = [
        {"path": row.path, "visits": row.visits, "total_time": int(row.total_time)}
        for row in activity_res.all()
    ]

    # Payment history
    payment_res = await db.execute(
        select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
    )
    payments = payment_res.scalars().all()
    payment_list = [
        {
            "id": p.id,
            "amount": p.amount,
            "currency": p.currency,
            "method": p.method,
            "status": p.status,
            "item_type": p.item_type,
            "item_id": p.item_id,
            "reference": p.reference,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in payments
    ]

    # Jackpot purchases
    jp_res = await db.execute(
        select(JackpotPurchase).where(JackpotPurchase.user_id == user_id).order_by(JackpotPurchase.created_at.desc())
    )
    jackpot_purchases = jp_res.scalars().all()

    return {
        "user": {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "subscription_tier": u.subscription_tier,
            "subscription_expires_at": u.subscription_expires_at.isoformat() if u.subscription_expires_at else None,
            "is_active": u.is_active,
            "is_admin": u.is_admin,
            "country": u.country,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_seen": u.last_seen.isoformat() if u.last_seen else None,
        },
        "pages": pages,
        "payments": payment_list,
        "total_time_spent": sum(p["total_time"] for p in pages),
        "total_spent": sum(p.amount for p in payments if p.status == "completed"),
        "jackpot_purchases": len(jackpot_purchases),
    }


# ═══════════════════════════════════════════════════════════════
#  FIXTURE SEARCH (for quick-add tips)
# ═══════════════════════════════════════════════════════════════

@router.get("/fixtures/search")
async def search_fixtures(
    q: str = Query(..., description="Search query (team name)"),
    date: Optional[str] = Query(None, description="Date (YYYY-MM-DD), defaults to today"),
    admin: User = Depends(require_admin),
):
    """Search fixtures by team name across ALL leagues. Searches the selected date ± 1 day for wider coverage."""
    from app.services.sports_api import fetch_fixtures_by_date
    from datetime import date as date_type, timedelta

    search_date = date or date_type.today().isoformat()
    
    # Search across 3 days for wider coverage (selected day ± 1)
    try:
        base = date_type.fromisoformat(search_date)
    except ValueError:
        base = date_type.today()
    
    dates_to_search = [
        (base - timedelta(days=1)).isoformat(),
        base.isoformat(),
        (base + timedelta(days=1)).isoformat(),
    ]
    
    all_fixtures = []
    for d in dates_to_search:
        try:
            day_fixtures = await fetch_fixtures_by_date(d)
            all_fixtures.extend(day_fixtures)
        except Exception:
            pass

    if not all_fixtures:
        return {"fixtures": [], "error": "No fixtures available. API may be unavailable."}

    # Filter by query — search team names, league name, and country
    q_lower = q.lower().strip()
    matched = [
        f for f in all_fixtures
        if q_lower in f.get("homeTeam", "").lower()
        or q_lower in f.get("awayTeam", "").lower()
        or q_lower in f.get("league", "").lower()
        or q_lower in f.get("country", "").lower()
    ]

    # Deduplicate by fixture ID
    seen = set()
    unique = []
    for f in matched:
        fid = f.get("id")
        if fid not in seen:
            seen.add(fid)
            unique.append(f)

    return {"fixtures": unique[:30]}

from pydantic import BaseModel
class MatchEnrichRequest(BaseModel):
    matches: List[dict]  # list of {"homeTeam": "...", "awayTeam": "..."}
    
@router.post("/fixtures/enrich")
async def enrich_fixtures(
    req: MatchEnrichRequest,
    admin: User = Depends(require_admin),
):
    """Bulk enrich a list of jackpot matches by fuzzy searching API-Football data."""
    from app.services.sports_api import fetch_fixtures_by_date
    from datetime import date as date_type, timedelta
    import difflib
    import re

    # Fetch a wide range of dates (-1 to +4 days) to cover weekend jackpots
    today = date_type.today()
    search_dates = [
        (today + timedelta(days=i)).isoformat() for i in range(-1, 5)
    ]
    
    all_fixtures = []
    for d in search_dates:
        try:
            day_fixtures = await fetch_fixtures_by_date(d)
            all_fixtures.extend(day_fixtures)
        except Exception:
            pass

    # Common name normalization for SportPesa -> API-Football mismatches
    NORMALIZE_MAP = {
        "man utd": "manchester united", "man united": "manchester united",
        "man city": "manchester city",
        "spurs": "tottenham", "tottenham hotspur": "tottenham",
        "wolves": "wolverhampton", "wolverhampton wanderers": "wolverhampton",
        "brighton": "brighton", "brighton and hove": "brighton",
        "west ham united": "west ham", "newcastle utd": "newcastle",
        "nottm forest": "nottingham forest", "nott'm forest": "nottingham forest",
        "sheff utd": "sheffield utd", "sheffield united": "sheffield utd",
        "luton": "luton town",
        "atletico": "atletico madrid", "atl madrid": "atletico madrid",
        "real": "real madrid",
        "barca": "barcelona", "fc barcelona": "barcelona",
        "psg": "paris saint germain", "paris sg": "paris saint germain",
        "bayern": "bayern munich", "fc bayern": "bayern munich",
        "dortmund": "borussia dortmund", "bvb": "borussia dortmund",
        "inter": "inter milan", "internazionale": "inter",
        "ac milan": "milan",
        "napoli": "ssc napoli",
        "roma": "as roma",
        "lazio": "ss lazio",
        "lyon": "olympique lyonnais", "ol": "olympique lyonnais",
        "marseille": "olympique de marseille", "om": "olympique de marseille",
    }

    def normalize(name: str) -> str:
        """Normalize a team name for flexible matching."""
        n = name.lower().strip()
        # Remove common prefixes/suffixes
        n = re.sub(r'\b(fc|cf|sc|ac|as|ss|ssc|afc|1\.)\b', '', n).strip()
        n = re.sub(r'\s+', ' ', n)
        return NORMALIZE_MAP.get(n, n)

    def find_fixture(query_home: str, query_away: str):
        """Find the best matching fixture using multiple strategies."""
        norm_home = normalize(query_home)
        norm_away = normalize(query_away)
        
        # Strategy 1: Exact normalized match on both teams
        for f in all_fixtures:
            f_home = normalize(f.get("homeTeam", ""))
            f_away = normalize(f.get("awayTeam", ""))
            if norm_home == f_home and norm_away == f_away:
                return f
        
        # Strategy 2: Substring match on both teams
        for f in all_fixtures:
            f_home = normalize(f.get("homeTeam", ""))
            f_away = normalize(f.get("awayTeam", ""))
            if (norm_home in f_home or f_home in norm_home) and \
               (norm_away in f_away or f_away in norm_away):
                return f
        
        # Strategy 3: Fuzzy match on home team only (broadest)
        all_team_names = [normalize(f.get("homeTeam", "")) for f in all_fixtures]
        all_team_names += [normalize(f.get("awayTeam", "")) for f in all_fixtures]
        
        # Try fuzzy match on home team
        home_candidates = difflib.get_close_matches(norm_home, all_team_names, n=3, cutoff=0.4)
        for candidate in home_candidates:
            for f in all_fixtures:
                if normalize(f.get("homeTeam", "")) == candidate or \
                   normalize(f.get("awayTeam", "")) == candidate:
                    return f
        
        # Strategy 4: Try fuzzy match on away team as last resort
        away_candidates = difflib.get_close_matches(norm_away, all_team_names, n=3, cutoff=0.4)
        for candidate in away_candidates:
            for f in all_fixtures:
                if normalize(f.get("homeTeam", "")) == candidate or \
                   normalize(f.get("awayTeam", "")) == candidate:
                    return f
        
        return None

    enriched = []
    
    for m in req.matches:
        home_q = m.get("homeTeam", "")
        away_q = m.get("awayTeam", "")
        country = m.get("country", "")
        countryFlag = m.get("countryFlag", "")
        
        matching_fixture = find_fixture(home_q, away_q)
        
        if matching_fixture:
            country = matching_fixture.get("country") or country
            countryFlag = matching_fixture.get("countryFlag") or countryFlag
                
        enriched.append({
            "homeTeam": m.get("homeTeam"),
            "awayTeam": m.get("awayTeam"),
            "country": country,
            "countryFlag": countryFlag,
        })
        
    return {"matches": enriched}


# ═══════════════════════════════════════════════════════════════
#  EXISTING ENDPOINTS (preserved)
# ═══════════════════════════════════════════════════════════════

class AdminUserListResponse(BaseModel):
    users: List[AdminUserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
    counts: Dict[str, int]


def _build_admin_user_filters(
    *,
    search: Optional[str],
    tier: str,
    online_cutoff: datetime,
) -> list:
    filters = []
    clean_search = (search or "").strip()
    if clean_search:
        pattern = f"%{clean_search}%"
        filters.append(
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
                User.country.ilike(pattern),
            )
        )

    if tier != "all":
        if tier == "online":
            filters.extend([
                User.last_seen.is_not(None),
                User.last_seen >= online_cutoff,
            ])
        else:
            filters.append(User.subscription_tier == tier)

    return filters


async def _resolve_bulk_target_users(
    *,
    db: AsyncSession,
    user_ids: List[int],
    apply_to_filtered: bool,
    search: Optional[str],
    filter_tier: str,
) -> List[User]:
    if apply_to_filtered:
        online_cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(minutes=3)
        filters = _build_admin_user_filters(
            search=search,
            tier=filter_tier,
            online_cutoff=online_cutoff,
        )
        users_stmt = select(User).order_by(User.id.asc())
        if filters:
            users_stmt = users_stmt.where(and_(*filters))
        return (await db.execute(users_stmt)).scalars().all()

    normalized_user_ids = sorted({int(user_id) for user_id in user_ids if int(user_id) > 0})
    if not normalized_user_ids:
        raise HTTPException(status_code=400, detail="Provide user_ids or enable apply_to_filtered.")

    return (
        await db.execute(
            select(User).where(User.id.in_(normalized_user_ids)).order_by(User.id.asc())
        )
    ).scalars().all()

@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    search: Optional[str] = Query(None),
    tier: str = Query("all"),
    sort_field: str = Query("last_seen"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    now = datetime.now(UTC).replace(tzinfo=None)
    online_cutoff = now - timedelta(minutes=3)

    path_totals_subq = (
        select(
            UserActivity.user_id.label("user_id"),
            UserActivity.path.label("path"),
            func.sum(UserActivity.time_spent_seconds).label("path_total"),
        )
        .group_by(UserActivity.user_id, UserActivity.path)
        .subquery()
    )

    ranked_paths_subq = (
        select(
            path_totals_subq.c.user_id,
            path_totals_subq.c.path,
            func.row_number().over(
                partition_by=path_totals_subq.c.user_id,
                order_by=(path_totals_subq.c.path_total.desc(), path_totals_subq.c.path.asc()),
            ).label("rn"),
        )
        .subquery()
    )

    top_path_subq = (
        select(
            ranked_paths_subq.c.user_id.label("user_id"),
            ranked_paths_subq.c.path.label("most_visited_page"),
        )
        .where(ranked_paths_subq.c.rn == 1)
        .subquery()
    )

    activity_totals_subq = (
        select(
            UserActivity.user_id.label("user_id"),
            func.sum(UserActivity.time_spent_seconds).label("total_time_spent"),
        )
        .group_by(UserActivity.user_id)
        .subquery()
    )

    filters = _build_admin_user_filters(
        search=search,
        tier=tier,
        online_cutoff=online_cutoff,
    )

    sort_exprs = {
        "name": User.name,
        "email": User.email,
        "subscription_tier": User.subscription_tier,
        "last_seen": User.last_seen,
        "total_time_spent": func.coalesce(activity_totals_subq.c.total_time_spent, 0),
        "created_at": User.created_at,
    }
    sort_column = sort_exprs.get(sort_field, User.last_seen)
    sort_direction = sort_dir.lower()
    if sort_direction not in {"asc", "desc"}:
        sort_direction = "desc"

    is_online_expr = case(
        (
            and_(User.last_seen.is_not(None), User.last_seen >= online_cutoff),
            1,
        ),
        else_=0,
    )

    total_stmt = select(func.count(User.id))
    if filters:
        total_stmt = total_stmt.where(and_(*filters))
    total = int((await db.execute(total_stmt)).scalar() or 0)

    users_stmt = (
        select(
            User,
            func.coalesce(activity_totals_subq.c.total_time_spent, 0).label("total_time_spent"),
            top_path_subq.c.most_visited_page,
        )
        .outerjoin(activity_totals_subq, activity_totals_subq.c.user_id == User.id)
        .outerjoin(top_path_subq, top_path_subq.c.user_id == User.id)
    )

    if filters:
        users_stmt = users_stmt.where(and_(*filters))

    if sort_direction == "asc":
        users_stmt = users_stmt.order_by(is_online_expr.desc(), sort_column.asc(), User.id.asc())
    else:
        users_stmt = users_stmt.order_by(is_online_expr.desc(), sort_column.desc(), User.id.desc())

    users_stmt = users_stmt.offset((page - 1) * per_page).limit(per_page)
    rows = (await db.execute(users_stmt)).all()

    response_users = []
    for user, total_time_spent, most_visited_page in rows:
        resp_obj = AdminUserResponse.model_validate(user)
        resp_obj.most_visited_page = most_visited_page
        resp_obj.total_time_spent = int(total_time_spent or 0)
        resp_obj.is_online = bool(user.last_seen and user.last_seen >= online_cutoff)
        response_users.append(resp_obj)

    total_all_users = int((await db.execute(select(func.count(User.id)))).scalar() or 0)
    online_count = int((
        await db.execute(
            select(func.count(User.id)).where(
                User.last_seen.is_not(None),
                User.last_seen >= online_cutoff,
            )
        )
    ).scalar() or 0)
    tier_rows = (
        await db.execute(
            select(User.subscription_tier, func.count(User.id))
            .group_by(User.subscription_tier)
        )
    ).all()

    counts: Dict[str, int] = {"all": total_all_users, "online": online_count}
    for subscription_tier, count in tier_rows:
        counts[subscription_tier] = int(count)

    return {
        "users": response_users,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 0,
        "counts": counts,
    }

@router.put("/users/{user_id}/revoke")
async def revoke_subscription(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u: raise HTTPException(status_code=404, detail="User not found")
    u.subscription_tier = "free"
    u.subscription_expires_at = None
    await db.commit()
    return {"status": "success"}


class GrantSubscriptionRequest(BaseModel):
    tier: str  # basic, standard, premium
    duration_days: int  # number of days to grant


class BulkGrantSubscriptionRequest(BaseModel):
    tier: str
    duration_days: int
    user_ids: List[int] = []
    apply_to_filtered: bool = False
    search: Optional[str] = None
    filter_tier: str = "all"


class BulkUserUpdateRequest(BaseModel):
    action: str
    user_ids: List[int] = []
    apply_to_filtered: bool = False
    search: Optional[str] = None
    filter_tier: str = "all"
    tier: Optional[str] = None
    duration_days: Optional[int] = None


class AdminSmsOnboardRequest(BaseModel):
    phone: str
    tier: str
    duration_days: int
    amount_paid: float


class LegacyMpesaListResponse(BaseModel):
    items: List[dict]
    total: int
    page: int
    per_page: int
    total_pages: int


class LegacyMpesaAssignRequest(BaseModel):
    tier: str
    duration_days: int


class LegacyMpesaBulkAssignRequest(BaseModel):
    tier: str
    duration_days: int
    queue_ids: List[int] = []
    apply_to_all_pending: bool = False


class LegacyMpesaDateRangeImportRequest(BaseModel):
    date_from: str
    date_to: str


class LegacyMpesaClearQueueResponse(BaseModel):
    status: str
    cleared: int


class LegacyMpesaDeleteQueueItemResponse(BaseModel):
    status: str
    deleted_id: int


@router.put("/users/{user_id}/grant-subscription")
async def grant_subscription(
    user_id: int,
    body: GrantSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Grant a subscription tier + duration to a user."""
    tier_res = await db.execute(select(SubscriptionTier.tier_id).where(SubscriptionTier.tier_id == body.tier))
    if not tier_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    if body.duration_days < 1 or body.duration_days > 365:
        raise HTTPException(status_code=400, detail="Duration must be 1-365 days.")

    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    u.subscription_tier = body.tier
    # If they already have time remaining, extend from current expiry; otherwise from now
    now = datetime.now(UTC).replace(tzinfo=None)
    current_expiry = u.subscription_expires_at if u.subscription_expires_at and u.subscription_expires_at > now else now
    u.subscription_expires_at = current_expiry + timedelta(days=body.duration_days)
    await db.commit()
    return {
        "status": "success",
        "tier": u.subscription_tier,
        "expires_at": u.subscription_expires_at.isoformat(),
    }


@router.put("/users/grant-subscription/bulk")
async def bulk_grant_subscription(
    body: BulkGrantSubscriptionRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    tier_res = await db.execute(select(SubscriptionTier.tier_id).where(SubscriptionTier.tier_id == body.tier))
    if not tier_res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    if body.duration_days < 1 or body.duration_days > 365:
        raise HTTPException(status_code=400, detail="Duration must be 1-365 days.")

    users = await _resolve_bulk_target_users(
        db=db,
        user_ids=body.user_ids,
        apply_to_filtered=body.apply_to_filtered,
        search=body.search,
        filter_tier=body.filter_tier,
    )

    if not users:
        raise HTTPException(status_code=404, detail="No users found for bulk subscription grant.")

    updated_user_ids: List[int] = []
    for user in users:
        _grant_subscription_access(user, body.tier, body.duration_days)
        db.add(user)
        updated_user_ids.append(user.id)

    await db.commit()

    return {
        "status": "success",
        "tier": body.tier,
        "duration_days": body.duration_days,
        "updated": len(updated_user_ids),
        "processed": len(users),
        "updated_user_ids": updated_user_ids,
    }


@router.put("/users/bulk-update")
async def bulk_update_users(
    body: BulkUserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    action = body.action.strip().lower()
    allowed_actions = {
        "grant_subscription",
        "revoke_subscription",
        "ban",
        "unban",
        "enable_sms",
        "disable_sms",
    }
    if action not in allowed_actions:
        raise HTTPException(status_code=400, detail=f"Unsupported bulk action: {body.action}")

    users = await _resolve_bulk_target_users(
        db=db,
        user_ids=body.user_ids,
        apply_to_filtered=body.apply_to_filtered,
        search=body.search,
        filter_tier=body.filter_tier,
    )
    if not users:
        raise HTTPException(status_code=404, detail="No users found for bulk update.")

    if action == "grant_subscription":
        if not body.tier:
            raise HTTPException(status_code=400, detail="tier is required for grant_subscription.")
        if body.duration_days is None or body.duration_days < 1 or body.duration_days > 365:
            raise HTTPException(status_code=400, detail="duration_days must be 1-365 for grant_subscription.")
        tier_res = await db.execute(select(SubscriptionTier.tier_id).where(SubscriptionTier.tier_id == body.tier))
        if not tier_res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    updated_user_ids: List[int] = []
    skipped_user_ids: List[int] = []

    for user in users:
        if action == "grant_subscription":
            _grant_subscription_access(user, body.tier, body.duration_days)
        elif action == "revoke_subscription":
            user.subscription_tier = "free"
            user.subscription_expires_at = None
        elif action == "ban":
            if user.id == admin.id:
                skipped_user_ids.append(user.id)
                continue
            user.is_active = False
        elif action == "unban":
            user.is_active = True
        elif action == "enable_sms":
            user.sms_tips_enabled = True
        elif action == "disable_sms":
            user.sms_tips_enabled = False

        db.add(user)
        updated_user_ids.append(user.id)

    await db.commit()

    return {
        "status": "success",
        "action": action,
        "tier": body.tier,
        "duration_days": body.duration_days,
        "updated": len(updated_user_ids),
        "processed": len(users),
        "skipped": len(skipped_user_ids),
        "updated_user_ids": updated_user_ids,
        "skipped_user_ids": skipped_user_ids,
    }


@router.post("/users/onboard-sms")
async def onboard_sms_user(
    body: AdminSmsOnboardRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.duration_days < 1 or body.duration_days > 365:
        raise HTTPException(status_code=400, detail="Duration must be 1-365 days.")
    if body.amount_paid <= 0:
        raise HTTPException(status_code=400, detail="Amount paid must be greater than zero.")

    tier_res = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == body.tier))
    tier = tier_res.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    phone = _normalize_phone(body.phone)
    if len(phone) < 10 or len(phone) > 20:
        raise HTTPException(status_code=400, detail="Invalid phone number format.")

    user, created = await ensure_phone_user(db, phone)

    _ensure_referral_code(user)
    _ensure_magic_login_token(user)
    user.sms_tips_enabled = True
    user.is_active = True

    _grant_subscription_access(user, body.tier, body.duration_days)
    db.add(user)
    await db.flush()

    payment = _create_subscription_payment(
        user=user,
        amount_paid=body.amount_paid,
        tier=body.tier,
        duration_days=body.duration_days,
        admin_id=admin.id,
        source="admin_sms_onboard",
    )
    db.add(payment)
    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "created": created,
        "user_id": user.id,
        "tier": user.subscription_tier,
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
        "sms_tips_enabled": user.sms_tips_enabled,
    }


@router.post("/legacy-mpesa/sync")
async def sync_legacy_mpesa_queue(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise HTTPException(status_code=400, detail="LEGACY_MPESA_DATABASE_URL is not configured.")

    latest_source_id = int((
        await db.execute(select(func.max(LegacyMpesaTransaction.source_record_id)))
    ).scalar() or 0)

    if latest_source_id > 0:
        records = await fetch_legacy_mpesa_records(after_source_record_id=latest_source_id)
    else:
        records = await fetch_latest_legacy_mpesa_records()

    stats = await sync_legacy_mpesa_transactions(db, records)

    return {
        "status": "success",
        "fetched": len(records),
        **stats,
    }


@router.post("/legacy-mpesa/backfill")
async def backfill_legacy_mpesa_history(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise HTTPException(status_code=400, detail="LEGACY_MPESA_DATABASE_URL is not configured.")

    earliest_source_id = int((
        await db.execute(select(func.min(LegacyMpesaTransaction.source_record_id)))
    ).scalar() or 0)

    if earliest_source_id > 0:
        records = await fetch_legacy_mpesa_records_before(before_source_record_id=earliest_source_id)
    else:
        records = await fetch_latest_legacy_mpesa_records()

    stats = await sync_legacy_mpesa_transactions(db, records)

    return {
        "status": "success",
        "mode": "backfill",
        "fetched": len(records),
        **stats,
    }


@router.post("/legacy-mpesa/import-range")
async def import_legacy_mpesa_date_range(
    body: LegacyMpesaDateRangeImportRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if not settings.LEGACY_MPESA_DATABASE_URL:
        raise HTTPException(status_code=400, detail="LEGACY_MPESA_DATABASE_URL is not configured.")

    try:
        date_from = datetime.strptime(body.date_from, "%Y-%m-%d").replace(tzinfo=None)
        date_to = datetime.strptime(body.date_to, "%Y-%m-%d").replace(tzinfo=None)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be in YYYY-MM-DD format.")

    if date_to < date_from:
        raise HTTPException(status_code=400, detail="date_to must be on or after date_from.")

    records = await fetch_legacy_mpesa_records_between(date_from=date_from, date_to=date_to)
    stats = await sync_legacy_mpesa_transactions(db, records)

    return {
        "status": "success",
        "mode": "date_range",
        "date_from": body.date_from,
        "date_to": body.date_to,
        "fetched": len(records),
        **stats,
    }


@router.get("/legacy-mpesa/queue", response_model=LegacyMpesaListResponse)
async def list_legacy_mpesa_queue(
    status_filter: str = Query("pending_assignment"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    filters = []
    if status_filter != "all":
        filters.append(LegacyMpesaTransaction.onboarding_status == status_filter)

    total_stmt = select(func.count(LegacyMpesaTransaction.id))
    if filters:
        total_stmt = total_stmt.where(and_(*filters))
    total = int((await db.execute(total_stmt)).scalar() or 0)

    queue_stmt = (
        select(LegacyMpesaTransaction, User.name, User.subscription_tier)
        .outerjoin(User, User.id == LegacyMpesaTransaction.user_id)
        .order_by(LegacyMpesaTransaction.paid_at.desc(), LegacyMpesaTransaction.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    if filters:
        queue_stmt = queue_stmt.where(and_(*filters))

    rows = (await db.execute(queue_stmt)).all()
    items = [
        {
            "id": item.id,
            "source_record_id": item.source_record_id,
            "biz_no": item.biz_no,
            "phone": item.phone,
            "first_name": item.first_name,
            "other_name": item.other_name,
            "amount": item.amount,
            "paid_at": item.paid_at.isoformat() if item.paid_at else None,
            "user_id": item.user_id,
            "user_name": user_name,
            "user_subscription_tier": subscription_tier,
            "payment_id": item.payment_id,
            "onboarding_status": item.onboarding_status,
            "assigned_tier": item.assigned_tier,
            "assigned_duration_days": item.assigned_duration_days,
            "assigned_at": item.assigned_at.isoformat() if item.assigned_at else None,
        }
        for item, user_name, subscription_tier in rows
    ]

    return {
        "items": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page else 0,
    }


@router.delete("/legacy-mpesa/queue", response_model=LegacyMpesaClearQueueResponse)
async def clear_legacy_mpesa_queue(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    pending_ids = (
        await db.execute(
            select(LegacyMpesaTransaction.id)
            .where(LegacyMpesaTransaction.onboarding_status == "pending_assignment")
        )
    ).scalars().all()

    if not pending_ids:
        return {
            "status": "success",
            "cleared": 0,
        }

    await db.execute(
        delete(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id.in_(pending_ids))
    )
    await db.commit()

    return {
        "status": "success",
        "cleared": len(pending_ids),
    }


@router.delete("/legacy-mpesa/{queue_id}", response_model=LegacyMpesaDeleteQueueItemResponse)
async def delete_legacy_mpesa_queue_item(
    queue_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    queue_item = (
        await db.execute(
            select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id == queue_id)
        )
    ).scalar_one_or_none()
    if not queue_item:
        raise HTTPException(status_code=404, detail="Legacy transaction not found")
    if queue_item.onboarding_status != "pending_assignment":
        raise HTTPException(status_code=400, detail="Only pending legacy transactions can be deleted")

    await db.delete(queue_item)
    await db.commit()

    return {
        "status": "success",
        "deleted_id": queue_id,
    }


@router.post("/legacy-mpesa/{queue_id}/assign")
async def assign_legacy_mpesa_transaction(
    queue_id: int,
    body: LegacyMpesaAssignRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.duration_days < 1 or body.duration_days > 365:
        raise HTTPException(status_code=400, detail="Duration must be 1-365 days.")

    tier_res = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == body.tier))
    tier = tier_res.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    queue_res = await db.execute(select(LegacyMpesaTransaction).where(LegacyMpesaTransaction.id == queue_id))
    queue_item = queue_res.scalar_one_or_none()
    if not queue_item:
        raise HTTPException(status_code=404, detail="Legacy transaction not found")
    if queue_item.onboarding_status == "assigned" and queue_item.payment_id:
        raise HTTPException(status_code=400, detail="Legacy transaction has already been assigned")

    user, payment = await _assign_legacy_queue_item(
        db,
        queue_item=queue_item,
        tier=body.tier,
        duration_days=body.duration_days,
        admin_id=admin.id,
    )

    await db.commit()
    await db.refresh(user)

    return {
        "status": "success",
        "queue_id": queue_item.id,
        "user_id": user.id,
        "payment_id": payment.id,
        "tier": user.subscription_tier,
        "expires_at": user.subscription_expires_at.isoformat() if user.subscription_expires_at else None,
    }


@router.post("/legacy-mpesa/assign-bulk")
async def bulk_assign_legacy_mpesa_transactions(
    body: LegacyMpesaBulkAssignRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if body.duration_days < 1 or body.duration_days > 365:
        raise HTTPException(status_code=400, detail="Duration must be 1-365 days.")

    tier_res = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == body.tier))
    tier = tier_res.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=400, detail=f"Invalid tier: {body.tier}")

    if body.apply_to_all_pending:
        queue_items = (
            await db.execute(
                select(LegacyMpesaTransaction)
                .where(LegacyMpesaTransaction.onboarding_status == "pending_assignment")
                .order_by(LegacyMpesaTransaction.id.asc())
            )
        ).scalars().all()
    else:
        queue_ids = sorted({int(queue_id) for queue_id in body.queue_ids if int(queue_id) > 0})
        if not queue_ids:
            raise HTTPException(status_code=400, detail="Provide queue_ids or enable apply_to_all_pending.")
        queue_items = (
            await db.execute(
                select(LegacyMpesaTransaction)
                .where(LegacyMpesaTransaction.id.in_(queue_ids))
                .order_by(LegacyMpesaTransaction.id.asc())
            )
        ).scalars().all()

    if not queue_items:
        raise HTTPException(status_code=404, detail="No legacy transactions found for bulk assignment.")

    assigned = 0
    skipped = 0
    assigned_queue_ids: List[int] = []

    for queue_item in queue_items:
        if queue_item.onboarding_status == "assigned" and queue_item.payment_id:
            skipped += 1
            continue
        await _assign_legacy_queue_item(
            db,
            queue_item=queue_item,
            tier=body.tier,
            duration_days=body.duration_days,
            admin_id=admin.id,
        )
        assigned += 1
        assigned_queue_ids.append(queue_item.id)

    await db.commit()

    return {
        "status": "success",
        "tier": body.tier,
        "duration_days": body.duration_days,
        "assigned": assigned,
        "skipped": skipped,
        "processed": len(queue_items),
        "assigned_queue_ids": assigned_queue_ids,
    }


@router.put("/users/{user_id}/toggle-active")
async def toggle_active(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u: raise HTTPException(status_code=404, detail="User not found")
    if u.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
        
    u.is_active = not u.is_active
    await db.commit()
    return {"status": "success", "is_active": u.is_active}


@router.get("/payments", response_model=List[PaymentResponse])
async def list_payments(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Payment).order_by(Payment.created_at.desc()).limit(100))
    return result.scalars().all()


@router.post("/users/{user_id}/make-admin")
async def make_admin(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_admin = True
    await db.commit()
    return {"message": f"User {user.name} is now an admin"}

class BroadcastPushRequest(BaseModel):
    title: str
    body: str
    icon: Optional[str] = "/tambua-logo.jpg"
    url: Optional[str] = "/"
    target_tier: str = "all"
    target_country: Optional[str] = None
    target_users: Optional[str] = None
    delivery_method: str = "both"

def send_webpush_task(subscriptions: list, payload: str):
    from pywebpush import webpush
    from urllib.parse import urlparse
    success, fail = 0, 0
    
    vapid_private_key = settings.VAPID_PRIVATE_KEY
    vapid_subject = settings.VAPID_SUBJECT or "mailto:admin@tambuatips.com"
    if vapid_subject and not vapid_subject.startswith("mailto:"):
        vapid_subject = f"mailto:{vapid_subject}"

    if not vapid_private_key:
        print("VAPID_PRIVATE_KEY not set, skipping push broadcast")
        return

    for sub in subscriptions:
        try:
            endpoint = sub.get("endpoint", "")
            parsed = urlparse(endpoint)
            audience = f"{parsed.scheme}://{parsed.netloc}"
            
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": vapid_subject, "aud": audience}
            )
            success += 1
        except Exception as ex:
            fail += 1
            print("Push error:", str(ex))
    print(f"Push Broadcast Done - Sent: {success}, Failed: {fail}")

def send_broadcast_sms_task(phones: list, message: str, sms_src: str):
    import httpx
    import asyncio
    import re
    # We use sync httpx in background task or create new loop
    async def _send_all():
        async with httpx.AsyncClient(timeout=5.0) as client:
            sms_url = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"
            for phone in phones:
                try:
                    stripped_phone = _normalize_phone_digits_for_sms(phone)
                    if not stripped_phone: continue
                    params = {
                        "src": sms_src,
                        "phone_number": stripped_phone,
                        "sms_message": message
                    }
                    await client.post(sms_url, params=params)
                except Exception:
                    pass
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(_send_all())
        else:
            asyncio.run(_send_all())
    except Exception:
        asyncio.run(_send_all())


@router.post("/broadcast-push")
async def broadcast_push(
    request: BroadcastPushRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    filters = []
    if request.target_tier == "free":
        filters.append(User.subscription_tier == "free")
    elif request.target_tier == "subscribers":
        filters.append(User.subscription_tier != "free")
    elif request.target_tier in ("basic", "standard", "premium"):
        filters.append(User.subscription_tier == request.target_tier)
    # "all" = no tier filter
    if request.target_country and request.target_country != "all":
        filters.append(User.country == request.target_country)
        
    if request.target_users:
        search_terms = [t.strip() for t in request.target_users.split(",") if t.strip()]
        if search_terms:
            or_conditions = []
            for term in search_terms:
                or_conditions.append(User.email.ilike(f"%{term}%"))
                or_conditions.append(User.phone.ilike(f"%{term}%"))
            filters.append(or_(*or_conditions))
            
    query = select(User)
    if filters:
        query = query.where(and_(*filters))
        
    result = await db.execute(query)
    users = result.scalars().all()
    
    all_subs = []
    for u in users:
        if isinstance(u.push_subscriptions, list):
            all_subs.extend(u.push_subscriptions)
            
    emails_sent = 0
    if request.delivery_method in ["both", "all", "email"]:
        for u in users:
            if u.email:
                background_tasks.add_task(send_broadcast_email, u.email, request.title, request.body, request.url)
                emails_sent += 1
                
    if request.delivery_method in ["both", "all", "push"]:
        payload = json.dumps({
            "title": request.title,
            "body": request.body,
            "icon": request.icon,
            "url": request.url
        })
        background_tasks.add_task(send_webpush_task, all_subs, payload)
        
    sms_sent = 0
    if request.delivery_method in ["all", "sms"]:
        sms_settings = await get_sms_settings(db)
        if sms_settings.get("SMS_ENABLED", True):
            sms_src = sms_settings.get("SMS_SRC", "ARVOCAP")
            phones = [u.phone for u in users if u.phone]
            if phones:
                sms_message = f"{request.title}\n{request.body}"
                if request.url and request.url != "/":
                    site_url = settings.FRONTEND_URL.replace("http://", "").replace("https://", "")
                    sms_message += f"\nLink: {site_url}{request.url}"
                background_tasks.add_task(send_broadcast_sms_task, phones, sms_message, sms_src)
                sms_sent = len(phones)
    
    return {
        "message": "Broadcast queued", 
        "targeted_users": len(users), 
        "total_subscriptions": len(all_subs) if request.delivery_method in ["both", "all", "push"] else 0,
        "emails_sent": emails_sent,
        "sms_sent": sms_sent
    }


# ═══════════════════════════════════════════════════════════════
#  AD POSTS (Custom Promo Slides)
# ═══════════════════════════════════════════════════════════════

@router.get("/ads", response_model=List[AdPostResponse])
async def list_admin_ads(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(AdPost).order_by(AdPost.created_at.desc()))
    return result.scalars().all()

@router.post("/ads", response_model=AdPostResponse)
async def create_admin_ad(data: AdPostCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    new_ad = AdPost(**data.model_dump())
    db.add(new_ad)
    await db.commit()
    await db.refresh(new_ad)
    return new_ad

@router.put("/ads/{ad_id}", response_model=AdPostResponse)
async def update_admin_ad(ad_id: int, data: AdPostUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(AdPost).where(AdPost.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad Post not found")
        
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ad, k, v)
        
    await db.commit()
    await db.refresh(ad)
    return ad

@router.delete("/ads/{ad_id}")
async def delete_admin_ad(ad_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(AdPost).where(AdPost.id == ad_id))
    ad = result.scalar_one_or_none()
    if not ad:
        raise HTTPException(status_code=404, detail="Ad Post not found")
        
    await db.delete(ad)
    await db.commit()
    return {"status": "success"}


# ═══════════════════════════════════════════════════════════════
#  AFFILIATE MARKETING MANAGEMENT
# ═══════════════════════════════════════════════════════════════

@router.get("/affiliates")
async def list_affiliates(
    status_filter: Optional[str] = Query(None, alias="status"),
    is_admin_filter: Optional[bool] = Query(None, alias="is_admin"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all affiliates with filtering and pagination."""
    query = select(Affiliate)
    count_query = select(func.count(Affiliate.id))

    filters = []
    if status_filter:
        filters.append(Affiliate.status == status_filter)
    if is_admin_filter is not None:
        filters.append(Affiliate.is_affiliate_admin == is_admin_filter)
    if search:
        search_like = f"%{search.lower()}%"
        filters.append(
            or_(
                func.lower(Affiliate.name).like(search_like),
                func.lower(Affiliate.email).like(search_like),
                func.lower(Affiliate.referral_code).like(search_like),
            )
        )

    if filters:
        query = query.where(and_(*filters))
        count_query = count_query.where(and_(*filters))

    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(Affiliate.created_at.desc()).offset(offset).limit(per_page)
    result = await db.execute(query)
    affiliates = result.scalars().all()

    items = []
    for aff in affiliates:
        # Get the admin name if assigned
        admin_name = None
        if aff.affiliate_admin_id:
            admin_res = await db.execute(select(Affiliate.name).where(Affiliate.id == aff.affiliate_admin_id))
            admin_name = admin_res.scalar_one_or_none()

        items.append({
            **AffiliateResponse.model_validate(aff).model_dump(),
            "admin_name": admin_name,
        })

    return {
        "affiliates": items,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if per_page > 0 else 0,
    }


@router.get("/affiliates/{affiliate_id}")
async def get_affiliate_detail(affiliate_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Get detailed info for a single affiliate."""
    result = await db.execute(select(Affiliate).where(Affiliate.id == affiliate_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    # Recent conversions
    conv_result = await db.execute(
        select(AffiliateConversion)
        .where(AffiliateConversion.affiliate_id == affiliate_id)
        .order_by(AffiliateConversion.created_at.desc())
        .limit(20)
    )
    conversions = conv_result.scalars().all()

    conv_items = []
    for c in conversions:
        user_res = await db.execute(select(User.name, User.email).where(User.id == c.user_id))
        user_info = user_res.first()
        conv_items.append({
            "id": c.id,
            "type": c.conversion_type,
            "amount": c.amount,
            "commission": c.commission_amount,
            "admin_commission": c.affiliate_admin_commission,
            "user_name": user_info.name if user_info else "Unknown",
            "user_email": user_info.email if user_info else "",
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })

    return {
        "affiliate": AffiliateResponse.model_validate(aff).model_dump(),
        "conversions": conv_items,
    }


@router.patch("/affiliates/{affiliate_id}/status")
async def update_affiliate_status(
    affiliate_id: int,
    body: AffiliateStatusUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Approve or suspend an affiliate."""
    result = await db.execute(select(Affiliate).where(Affiliate.id == affiliate_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    old_status = aff.status
    aff.status = body.status
    db.add(aff)
    await db.commit()

    # Notify affiliate via SMS when approved
    if body.status == "approved" and old_status != "approved":
        if aff.phone and not aff.phone.endswith('@phone.local'):
            background_tasks.add_task(_notify_affiliate_approved, aff.phone, aff.name, db)
        if aff.email and not aff.email.endswith('@phone.local'):
            background_tasks.add_task(send_affiliate_approved_email, aff.email, aff.name)

    return {"status": "success", "message": f"Affiliate status updated to '{body.status}'"}


@router.patch("/affiliates/{affiliate_id}/make-admin")
async def toggle_affiliate_admin(
    affiliate_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Promote or demote an affiliate to/from affiliate admin."""
    result = await db.execute(select(Affiliate).where(Affiliate.id == affiliate_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    aff.is_affiliate_admin = not aff.is_affiliate_admin
    db.add(aff)
    await db.commit()

    action = "promoted to" if aff.is_affiliate_admin else "demoted from"
    return {"status": "success", "message": f"Affiliate {action} admin", "is_affiliate_admin": aff.is_affiliate_admin}


@router.patch("/affiliates/{affiliate_id}/assign-admin")
async def assign_affiliate_admin(
    affiliate_id: int,
    body: AffiliateAdminAssign,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Assign an affiliate to an affiliate admin (or unassign with null)."""
    result = await db.execute(select(Affiliate).where(Affiliate.id == affiliate_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    if body.affiliate_admin_id is not None:
        # Validate the admin exists and is actually an affiliate admin
        admin_res = await db.execute(
            select(Affiliate).where(Affiliate.id == body.affiliate_admin_id, Affiliate.is_affiliate_admin == True)
        )
        affiliate_admin = admin_res.scalar_one_or_none()
        if not affiliate_admin:
            raise HTTPException(status_code=400, detail="Target affiliate admin not found or is not an admin")
        if body.affiliate_admin_id == affiliate_id:
            raise HTTPException(status_code=400, detail="Cannot assign affiliate to themselves")

    aff.affiliate_admin_id = body.affiliate_admin_id
    db.add(aff)
    await db.commit()
    return {"status": "success"}


# ── Commission Config ────────────────────────────────────────

@router.get("/affiliate-commissions")
async def get_commission_configs(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Get all commission configs."""
    result = await db.execute(select(AffiliateCommissionConfig).order_by(AffiliateCommissionConfig.item_type, AffiliateCommissionConfig.tier_id))
    configs = result.scalars().all()
    return {"configs": [CommissionConfigResponse.model_validate(c) for c in configs]}


@router.put("/affiliate-commissions")
async def update_commission_configs(
    configs: List[CommissionConfigUpdate],
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Upsert commission configs. Each config is identified by (item_type, tier_id, duration)."""
    for cfg in configs:
        result = await db.execute(
            select(AffiliateCommissionConfig).where(
                AffiliateCommissionConfig.item_type == cfg.item_type,
                AffiliateCommissionConfig.tier_id == cfg.tier_id,
                AffiliateCommissionConfig.duration == cfg.duration,
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.commission_percent = cfg.commission_percent
            existing.affiliate_admin_commission_percent = cfg.affiliate_admin_commission_percent
            existing.earn_on_renewal = cfg.earn_on_renewal
            db.add(existing)
        else:
            new_config = AffiliateCommissionConfig(
                item_type=cfg.item_type,
                tier_id=cfg.tier_id,
                duration=cfg.duration,
                commission_percent=cfg.commission_percent,
                affiliate_admin_commission_percent=cfg.affiliate_admin_commission_percent,
                earn_on_renewal=cfg.earn_on_renewal,
            )
            db.add(new_config)

    await db.commit()
    return {"status": "success", "message": f"{len(configs)} commission config(s) saved"}


# ── Payouts ──────────────────────────────────────────────────

@router.post("/affiliates/{affiliate_id}/pay")
async def pay_affiliate(
    affiliate_id: int,
    body: PayoutRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Trigger M-Pesa B2C payout to a single affiliate."""
    from app.services.mpesa_b2c import initiate_b2c_payment

    result = await db.execute(select(Affiliate).where(Affiliate.id == affiliate_id))
    aff = result.scalar_one_or_none()
    if not aff:
        raise HTTPException(status_code=404, detail="Affiliate not found")

    balance = aff.commission_balance
    if balance <= 0:
        raise HTTPException(status_code=400, detail="No pending commission to pay out")

    # Create payout record
    now = datetime.now(UTC).replace(tzinfo=None)
    payout = AffiliatePayout(
        affiliate_id=aff.id,
        amount=balance,
        phone=aff.phone,
        status="pending",
        period_start=body.period_start or now.replace(day=1),
        period_end=body.period_end or now,
    )
    db.add(payout)
    await db.commit()
    await db.refresh(payout)

    try:
        reference = f"AFF-PAY-{payout.id}"
        b2c_result = initiate_b2c_payment(aff.phone, balance, reference)

        # If we get here without exception, mark success
        payout.status = "completed"
        payout.transaction_id = b2c_result.get("ConversationID") or b2c_result.get("transaction_id", "")

        # Credit the paid amount
        aff.commission_paid = (aff.commission_paid or 0.0) + balance
        db.add(aff)
        db.add(payout)
        await db.commit()

        return {
            "status": "success",
            "payout_id": payout.id,
            "amount": balance,
            "transaction_id": payout.transaction_id,
        }

    except Exception as e:
        payout.status = "failed"
        db.add(payout)
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Payout failed: {str(e)}")


@router.post("/affiliates/pay-all")
async def pay_all_affiliates(
    body: PayoutRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """Batch payout: pay all affiliates with positive balance."""
    from app.services.mpesa_b2c import initiate_b2c_payment

    result = await db.execute(
        select(Affiliate).where(Affiliate.status == "approved")
    )
    affiliates = result.scalars().all()

    now = datetime.now(UTC).replace(tzinfo=None)
    results_list = []

    for aff in affiliates:
        balance = aff.commission_balance
        if balance <= 0:
            continue

        payout = AffiliatePayout(
            affiliate_id=aff.id,
            amount=balance,
            phone=aff.phone,
            status="pending",
            period_start=body.period_start or now.replace(day=1),
            period_end=body.period_end or now,
        )
        db.add(payout)
        await db.commit()
        await db.refresh(payout)

        try:
            reference = f"AFF-PAY-{payout.id}"
            b2c_result = await initiate_b2c_payment(aff.phone, balance, reference)

            payout.status = "completed"
            payout.transaction_id = b2c_result.get("ConversationID") or b2c_result.get("transaction_id", "")
            aff.commission_paid = (aff.commission_paid or 0.0) + balance
            db.add(aff)
            db.add(payout)
            await db.commit()

            results_list.append({"affiliate_id": aff.id, "name": aff.name, "amount": balance, "status": "completed"})
        except Exception as e:
            payout.status = "failed"
            db.add(payout)
            await db.commit()
            results_list.append({"affiliate_id": aff.id, "name": aff.name, "amount": balance, "status": "failed", "error": str(e)})

    return {
        "status": "success",
        "total_paid": len([r for r in results_list if r["status"] == "completed"]),
        "total_failed": len([r for r in results_list if r["status"] == "failed"]),
        "details": results_list,
    }


@router.get("/affiliate-payouts")
async def list_affiliate_payouts(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    """List all payout history."""
    count = (await db.execute(select(func.count(AffiliatePayout.id)))).scalar() or 0

    result = await db.execute(
        select(AffiliatePayout)
        .order_by(AffiliatePayout.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    payouts = result.scalars().all()

    items = []
    for p in payouts:
        aff_res = await db.execute(select(Affiliate.name, Affiliate.email).where(Affiliate.id == p.affiliate_id))
        aff_info = aff_res.first()
        items.append({
            "id": p.id,
            "affiliate_name": aff_info.name if aff_info else "Unknown",
            "affiliate_email": aff_info.email if aff_info else "",
            "amount": p.amount,
            "method": p.method,
            "phone": p.phone,
            "status": p.status,
            "transaction_id": p.transaction_id,
            "period_start": p.period_start.isoformat() if p.period_start else None,
            "period_end": p.period_end.isoformat() if p.period_end else None,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        })

    return {"payouts": items, "total": count, "page": page, "per_page": per_page}


@router.get("/affiliate-stats")
async def affiliate_overview_stats(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    """Aggregate affiliate program stats for admin dashboard."""
    total_affiliates = (await db.execute(select(func.count(Affiliate.id)))).scalar() or 0
    pending_affiliates = (await db.execute(
        select(func.count(Affiliate.id)).where(Affiliate.status == "pending")
    )).scalar() or 0
    active_affiliates = (await db.execute(
        select(func.count(Affiliate.id)).where(Affiliate.status == "approved")
    )).scalar() or 0

    total_clicks = (await db.execute(select(func.count(AffiliateClick.id)))).scalar() or 0
    total_signups = (await db.execute(
        select(func.count(AffiliateConversion.id)).where(AffiliateConversion.conversion_type == "signup")
    )).scalar() or 0
    total_purchases = (await db.execute(
        select(func.count(AffiliateConversion.id)).where(AffiliateConversion.conversion_type == "purchase")
    )).scalar() or 0

    total_commission = (await db.execute(
        select(func.coalesce(func.sum(AffiliateConversion.commission_amount), 0.0))
        .where(AffiliateConversion.conversion_type == "purchase")
    )).scalar() or 0.0
    total_paid = (await db.execute(
        select(func.coalesce(func.sum(AffiliatePayout.amount), 0.0))
        .where(AffiliatePayout.status == "completed")
    )).scalar() or 0.0

    total_revenue_from_affiliates = (await db.execute(
        select(func.coalesce(func.sum(AffiliateConversion.amount), 0.0))
        .where(AffiliateConversion.conversion_type == "purchase")
    )).scalar() or 0.0

    return {
        "total_affiliates": total_affiliates,
        "pending_affiliates": pending_affiliates,
        "active_affiliates": active_affiliates,
        "total_clicks": total_clicks,
        "total_signups": total_signups,
        "total_purchases": total_purchases,
        "total_commission": float(total_commission),
        "total_paid": float(total_paid),
        "unpaid_commission": float(total_commission) - float(total_paid),
        "total_revenue_from_affiliates": float(total_revenue_from_affiliates),
    }
