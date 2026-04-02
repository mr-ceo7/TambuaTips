"""
Admin routes — privileged operations + analytics dashboard.
"""

import csv
import io
import json
from typing import List, Optional
from datetime import datetime, timedelta

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
#  SETTINGS
# ═══════════════════════════════════════════════════════════════

class SettingsUpdateProps(BaseModel):
    referral_vip_days: int

@router.get("/settings")
async def get_settings(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(AdminSetting))
    settings_db = result.scalars().all()
    out = {"referral_vip_days": 7} # default
    for s in settings_db:
        if s.key == "REFERRAL_VIP_DAYS":
            out["referral_vip_days"] = int(s.value) if s.value.isdigit() else 7
    return out

@router.put("/settings")
async def update_settings(body: SettingsUpdateProps, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    res = await db.execute(select(AdminSetting).where(AdminSetting.key == "REFERRAL_VIP_DAYS"))
    setting = res.scalar_one_or_none()
    if not setting:
        setting = AdminSetting(key="REFERRAL_VIP_DAYS", value=str(body.referral_vip_days), description="Days of VIP granted to referrers")
        db.add(setting)
    else:
        setting.value = str(body.referral_vip_days)
    await db.commit()
    return {"status": "success", "referral_vip_days": body.referral_vip_days}


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
        import traceback
        error_details = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Failed: {str(e)}\n\n{error_details}")

@router.get("/dashboard")
async def dashboard_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to track history"),
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    """Aggregated dashboard stats for the admin overview."""
    now = datetime.utcnow()
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
        headers={"Content-Disposition": f"attachment; filename=tambuatips_transactions_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
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
        return {"fixtures": [], "error": str(e)}

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
    now = datetime.utcnow()
    
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
        total_time_spent = sum(act.total for act in activities) if activities else 0
        
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
    for sub in subscriptions:
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_SUBJECT or "mailto:admin@tambuatips.com"}
            )
            success += 1
        except Exception as ex:
            fail += 1
            print("Push error:", str(ex))
    print(f"Push Broadcast Done - Sent: {success}, Failed: {fail}")

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
    if request.delivery_method in ["both", "email"]:
        for u in users:
            if u.email:
                background_tasks.add_task(send_broadcast_email, u.email, request.title, request.body, request.url)
                emails_sent += 1
                
    if request.delivery_method in ["both", "push"]:
        payload = json.dumps({
            "title": request.title,
            "body": request.body,
            "icon": request.icon,
            "url": request.url
        })
        background_tasks.add_task(send_webpush_task, all_subs, payload)
    
    return {
        "message": "Broadcast queued", 
        "targeted_users": len(users), 
        "total_subscriptions": len(all_subs) if request.delivery_method in ["both", "push"] else 0,
        "emails_sent": emails_sent
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
