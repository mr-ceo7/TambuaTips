"""
Admin routes — privileged operations + analytics dashboard.
"""

import csv
import io
import json
from typing import List, Optional
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, delete, update

from app.dependencies import get_db, require_admin
from app.models.user import User
from app.models.payment import Payment
from app.models.tip import Tip
from app.models.jackpot import Jackpot, JackpotPurchase
from app.models.subscription import SubscriptionTier
from app.models.activity import UserActivity, AnonymousVisitor
from app.models.ad import AdPost
from app.models.setting import AdminSetting
from app.schemas.auth import UserResponse, AdminUserResponse
from app.schemas.payment import PaymentResponse
from app.schemas.ad import AdPostCreate, AdPostUpdate, AdPostResponse
from app.services.email_service import send_broadcast_email
from app.config import settings

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ═══════════════════════════════════════════════════════════════
#  SETTINGS — Referral Economics Configuration
# ═══════════════════════════════════════════════════════════════

# Default referral settings (used when no AdminSetting row exists yet)
REFERRAL_DEFAULTS = {
    "referral_enabled": "true",
    "referral_reward_tier": "basic",
    "referral_reward_days": "7",
    "referral_new_user_reward": "false",
    "referral_new_user_reward_tier": "basic",
    "referral_new_user_reward_days": "7",
    "referral_free_tips_count": "1",
}

REFERRAL_DESCRIPTIONS = {
    "referral_enabled": "Master toggle for the referral system",
    "referral_reward_tier": "Subscription tier granted to the referrer",
    "referral_reward_days": "Days of access granted to the referrer per referral",
    "referral_new_user_reward": "Whether the new user also gets rewarded on sign-up",
    "referral_new_user_reward_tier": "Subscription tier granted to the new user",
    "referral_new_user_reward_days": "Days of access granted to the new user",
    "referral_free_tips_count": "Number of premium tips unlocked per successful referral",
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
    referral_reward_tier: Optional[str] = None
    referral_reward_days: Optional[int] = None
    referral_new_user_reward: Optional[bool] = None
    referral_new_user_reward_tier: Optional[str] = None
    referral_new_user_reward_days: Optional[int] = None
    referral_free_tips_count: Optional[int] = None


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

    # Current settings
    ref_settings = await get_referral_settings(db)

    return {
        "total_referrals": total_referrals,
        "referred_users": referred_users_count,
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
            .where(User.subscription_tier != None)
            .values(subscription_tier=None, subscription_expires_at=None)
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
    """Search upcoming fixtures by team name via API-Football."""
    from app.services.sports_api import fetch_fixtures_by_date
    from datetime import date as date_type

    search_date = date or date_type.today().isoformat()
    
    try:
        fixtures = await fetch_fixtures_by_date(search_date)
    except Exception as e:
        # API might be unavailable — return empty gracefully 
        error_msg = str(e) if settings.DEBUG else "Service unavailable"
        return {"fixtures": [], "error": error_msg}

    # Filter by query
    q_lower = q.lower()
    matched = [
        f for f in fixtures
        if q_lower in f.get("homeTeam", "").lower()
        or q_lower in f.get("awayTeam", "").lower()
        or q_lower in f.get("league", "").lower()
    ]

    return {"fixtures": matched[:20]}


# ═══════════════════════════════════════════════════════════════
#  EXISTING ENDPOINTS (preserved)
# ═══════════════════════════════════════════════════════════════

@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    
    response = []
    now = datetime.now(UTC).replace(tzinfo=None)
    
    for u in users:
        is_online = u.last_seen and (now - u.last_seen) < timedelta(minutes=3)
        
        activity_res = await db.execute(
            select(
                UserActivity.path,
                func.sum(UserActivity.time_spent_seconds).label("total")
            )
            .where(UserActivity.user_id == u.id)
            .group_by(UserActivity.path)
            .order_by(func.sum(UserActivity.time_spent_seconds).desc())
        )
        activities = activity_res.all()
        
        most_visited_page = activities[0].path if activities else None
        total_time_spent = int(sum(act.total for act in activities) if activities else 0)
        
        resp_obj = AdminUserResponse.model_validate(u)
        resp_obj.most_visited_page = most_visited_page
        resp_obj.total_time_spent = total_time_spent
        resp_obj.is_online = bool(is_online)
        response.append(resp_obj)
        
    return response

@router.put("/users/{user_id}/revoke")
async def revoke_subscription(user_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    u = result.scalar_one_or_none()
    if not u: raise HTTPException(status_code=404, detail="User not found")
    u.subscription_tier = "free"
    u.subscription_expires_at = None
    await db.commit()
    return {"status": "success"}

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
    delivery_method: str = "both"

def send_webpush_task(subscriptions: list, payload: str):
    from pywebpush import webpush, WebPushException
    success, fail = 0, 0
    
    vapid_subject = settings.VAPID_SUBJECT or "mailto:admin@tambuatips.com"
    if vapid_subject and not vapid_subject.startswith("mailto:") and "@" in vapid_subject:
        vapid_subject = f"mailto:{vapid_subject}"
        
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": vapid_subject}
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
                    stripped_phone = re.sub(r'[\D]', '', phone)
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
    elif request.target_tier == "premium":
        filters.append(User.subscription_tier != "free")
    if request.target_country and request.target_country != "all":
        filters.append(User.country == request.target_country)
        
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
