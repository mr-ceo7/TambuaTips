"""
Affiliate portal routes: register, login, dashboard, conversions, payouts,
and affiliate-admin team management.
"""

import uuid
import os
import string
import random
from datetime import datetime, timedelta, UTC
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.auth import GoogleLoginRequest, PhoneLoginRequest, PhoneVerifyRequest
from app.routers.auth import _send_otp_sms, _normalize_phone
from sqlalchemy import select, func, and_, extract

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from app.schemas.auth import GoogleLoginRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract

from app.database import AsyncSessionLocal
from app.dependencies import get_db
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.affiliate import (
    Affiliate, AffiliateClick, AffiliateConversion,
    AffiliatePayout, AffiliateCommissionConfig,
)
from app.models.user import User
from app.schemas.affiliate import (
    AffiliateRegister, AffiliateLogin, AffiliateResponse,
    AffiliateDashboardStats, ConversionResponse, PayoutResponse,
    TeamMemberResponse,
)

router = APIRouter(prefix="/api/affiliate", tags=["Affiliate"])
security_scheme = HTTPBearer(auto_error=False)


# ── Auth Dependency ──────────────────────────────────────────

async def get_current_affiliate(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> Affiliate:
    """
    Extract and validate the current affiliate from cookie or Bearer token.
    Only accepts tokens with type='affiliate'.
    """
    token = request.cookies.get("affiliate_token")
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    payload = decode_token(token)
    if payload is None or payload.get("type") != "affiliate":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired affiliate token",
        )

    affiliate_id = payload.get("sub")
    if affiliate_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    result = await db.execute(select(Affiliate).where(Affiliate.id == int(affiliate_id)))
    affiliate = result.scalar_one_or_none()

    if affiliate is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Affiliate not found")

    if affiliate.status == "suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    return affiliate


def create_affiliate_access_token(affiliate_id: int) -> str:
    """Create a JWT specifically for affiliates (type='affiliate')."""
    from app.config import settings
    from jose import jwt
    from datetime import timezone
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    payload = {
        "sub": str(affiliate_id),
        "exp": expire,
        "type": "affiliate",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_affiliate_refresh_token(affiliate_id: int) -> str:
    """Create a refresh JWT for affiliates."""
    from app.config import settings
    from jose import jwt
    from datetime import timezone
    expire = datetime.now(timezone.utc) + timedelta(days=30)
    payload = {
        "sub": str(affiliate_id),
        "exp": expire,
        "type": "affiliate_refresh",
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


# ── Registration & Login ─────────────────────────────────────

@router.post("/register")
async def register_affiliate(body: AffiliateRegister, db: AsyncSession = Depends(get_db)):
    """Register a new affiliate marketer. Status will be 'pending' until admin approves."""
    # Check duplicate email
    existing = await db.execute(select(Affiliate).where(Affiliate.email == body.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An affiliate account with this email already exists")

    # Generate unique referral code
    safe_name = "".join([c for c in body.name if c.isalpha()])[:4].upper()
    if len(safe_name) < 3:
        safe_name = "AFF"
    referral_code = f"{safe_name}-{uuid.uuid4().hex[:6].upper()}"

    affiliate = Affiliate(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        password_hash=hash_password(body.password),
        phone=body.phone.strip(),
        referral_code=referral_code,
        status="pending",  # Requires admin approval
    )
    db.add(affiliate)
    await db.commit()
    await db.refresh(affiliate)

    return {
        "status": "success",
        "message": "Registration successful! Your account is pending admin approval. You will be notified once approved.",
        "affiliate_id": affiliate.id,
    }


@router.post("/login")
async def login_affiliate(body: AffiliateLogin, response: Response, db: AsyncSession = Depends(get_db)):
    """Login to affiliate portal."""
    result = await db.execute(
        select(Affiliate).where(Affiliate.email == body.email.lower().strip())
    )
    affiliate = result.scalar_one_or_none()

    if not affiliate or not verify_password(body.password, affiliate.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if affiliate.status == "suspended":
        raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")

    if affiliate.status == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your account is still pending approval. Please wait for admin review."
        )

    # Issue tokens
    access_token = create_affiliate_access_token(affiliate.id)
    refresh_token = create_affiliate_refresh_token(affiliate.id)

    response.set_cookie(
        key="affiliate_token", value=access_token,
        httponly=True, secure=True, samesite="none", max_age=86400,
    )
    response.set_cookie(
        key="affiliate_refresh", value=refresh_token,
        httponly=True, secure=True, samesite="none", max_age=2592000,
    )

    return {"status": "success"}


@router.post("/google")
async def google_auth_affiliate(body: GoogleLoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Login or register affiliate using Google One Tap."""
    try:
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(body.id_token, google_requests.Request(), client_id)
        
        email = idinfo.get("email")
        name = idinfo.get("name")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email provided in Google Token")
            
        result = await db.execute(select(Affiliate).where(Affiliate.email == email.lower().strip()))
        affiliate = result.scalar_one_or_none()
        
        if not affiliate:
            # Auto-register as pending
            safe_name = "".join([c for c in (name or "User") if c.isalpha()])[:4].upper()
            if len(safe_name) < 3:
                safe_name = "AFF"
            referral_code = f"{safe_name}-{uuid.uuid4().hex[:6].upper()}"
            
            rand_pass = "".join(random.choices(string.ascii_letters + string.digits, k=32))
            
            affiliate = Affiliate(
                name=(name or "Google User").strip(),
                email=email.lower().strip(),
                password_hash=hash_password(rand_pass),
                phone="", # Empty for Google
                referral_code=referral_code,
                status="pending",
            )
            db.add(affiliate)
            await db.commit()

        if affiliate.status == "suspended":
            raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")

        # Issue tokens
        access_token = create_affiliate_access_token(affiliate.id)
        refresh_token = create_affiliate_refresh_token(affiliate.id)

        response.set_cookie(
            key="affiliate_token", value=access_token,
            httponly=True, secure=True, samesite="none", max_age=86400,
        )
        response.set_cookie(
            key="affiliate_refresh", value=refresh_token,
            httponly=True, secure=True, samesite="none", max_age=2592000,
        )

        return {"status": "success"}
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")


def _normalize_affiliate_phone(phone: str) -> str:
    """Normalize phone for affiliates: strip whitespace, handle Kenyan 07/01 prefix."""
    import re as _re
    phone = _re.sub(r'[\s\-\(\)]', '', phone)
    # Handle Kenyan local format: 07xx or 01xx -> +2547xx / +2541xx
    if phone.startswith('07') or phone.startswith('01'):
        phone = '+254' + phone[1:]
    elif phone.startswith('254'):
        phone = '+' + phone
    elif not phone.startswith('+'):
        phone = '+' + phone
    return phone


@router.post("/phone/request-otp")
async def request_affiliate_phone_otp(body: PhoneLoginRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Request OTP for affiliate login/registration."""
    phone = _normalize_affiliate_phone(body.phone)
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number.")
        
    code = str(random.randint(10000, 99999))
    
    result = await db.execute(select(Affiliate).where(Affiliate.phone == phone))
    affiliate = result.scalar_one_or_none()
    
    if affiliate:
        if affiliate.status == "suspended":
            raise HTTPException(status_code=403, detail="Your account has been suspended. Contact support.")
        affiliate.otp_code = code
        affiliate.otp_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=5)
        db.add(affiliate)
    else:
        safe_name = "AFF"
        referral_code = f"{safe_name}-{uuid.uuid4().hex[:6].upper()}"
        rand_pass = "".join(random.choices(string.ascii_letters + string.digits, k=32))
        
        affiliate = Affiliate(
            name="Phone Affiliate",
            email=f"{phone.replace('+', '')}@phone.local",
            password_hash=hash_password(rand_pass),
            phone=phone,
            referral_code=referral_code,
            status="pending",
            otp_code=code,
            otp_expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=5)
        )
        db.add(affiliate)
        
    await db.commit()
    await _send_otp_sms(phone, code, db)
    return {"status": "success", "message": "OTP sent successfully."}


@router.post("/phone/verify-otp")
async def verify_affiliate_phone_otp(body: PhoneVerifyRequest, response: Response, db: AsyncSession = Depends(get_db)):
    """Verify OTP and issue affiliate tokens."""
    phone = _normalize_affiliate_phone(body.phone)
    
    result = await db.execute(select(Affiliate).where(Affiliate.phone == phone))
    affiliate = result.scalar_one_or_none()
    
    if not affiliate or affiliate.status == "suspended":
        raise HTTPException(status_code=403, detail="Account not found or suspended.")
        
    if not affiliate.otp_code or affiliate.otp_code != body.code:
        raise HTTPException(status_code=400, detail="Invalid verification code.")
        
    if not affiliate.otp_expires_at or affiliate.otp_expires_at < datetime.now(UTC).replace(tzinfo=None):
        raise HTTPException(status_code=400, detail="Verification code expired. Please request a new one.")
        
    # Clear the OTP
    affiliate.otp_code = None
    affiliate.otp_expires_at = None
    db.add(affiliate)
    await db.commit()

    # Issue tokens
    access_token = create_affiliate_access_token(affiliate.id)
    refresh_token = create_affiliate_refresh_token(affiliate.id)

    response.set_cookie(
        key="affiliate_token", value=access_token,
        httponly=True, secure=True, samesite="none", max_age=86400,
    )
    response.set_cookie(
        key="affiliate_refresh", value=refresh_token,
        httponly=True, secure=True, samesite="none", max_age=2592000,
    )

    return {"status": "success"}


@router.post("/logout")
async def logout_affiliate(response: Response):
    response.delete_cookie("affiliate_token", samesite="none", secure=True)
    response.delete_cookie("affiliate_refresh", samesite="none", secure=True)
    return {"status": "success"}


@router.post("/refresh")
async def refresh_affiliate(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    """Refresh affiliate access token."""
    refresh_token = request.cookies.get("affiliate_refresh")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "affiliate_refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    affiliate_id = payload.get("sub")
    result = await db.execute(select(Affiliate).where(Affiliate.id == int(affiliate_id)))
    affiliate = result.scalar_one_or_none()

    if not affiliate:
        raise HTTPException(status_code=401, detail="Affiliate not found")

    access_token = create_affiliate_access_token(affiliate.id)
    new_refresh = create_affiliate_refresh_token(affiliate.id)

    response.set_cookie(
        key="affiliate_token", value=access_token,
        httponly=True, secure=True, samesite="none", max_age=86400,
    )
    response.set_cookie(
        key="affiliate_refresh", value=new_refresh,
        httponly=True, secure=True, samesite="none", max_age=2592000,
    )

    return {"status": "success"}


# ── Profile ──────────────────────────────────────────────────

@router.get("/me", response_model=AffiliateResponse)
async def get_me(affiliate: Affiliate = Depends(get_current_affiliate)):
    return affiliate


# ── Dashboard Stats ──────────────────────────────────────────

@router.get("/dashboard", response_model=AffiliateDashboardStats)
async def get_dashboard(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregate dashboard stats for the current affiliate."""
    now = datetime.now(UTC).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Total purchases count
    total_purchases = await db.execute(
        select(func.count(AffiliateConversion.id)).where(
            AffiliateConversion.affiliate_id == affiliate.id,
            AffiliateConversion.conversion_type == "purchase",
        )
    )

    # Monthly clicks
    month_clicks = await db.execute(
        select(func.count(AffiliateClick.id)).where(
            AffiliateClick.affiliate_id == affiliate.id,
            AffiliateClick.created_at >= month_start,
        )
    )

    # Monthly signups
    month_signups = await db.execute(
        select(func.count(AffiliateConversion.id)).where(
            AffiliateConversion.affiliate_id == affiliate.id,
            AffiliateConversion.conversion_type == "signup",
            AffiliateConversion.created_at >= month_start,
        )
    )

    # Monthly purchases + commission
    month_purchases_q = await db.execute(
        select(
            func.count(AffiliateConversion.id),
            func.coalesce(func.sum(AffiliateConversion.commission_amount), 0.0),
        ).where(
            AffiliateConversion.affiliate_id == affiliate.id,
            AffiliateConversion.conversion_type == "purchase",
            AffiliateConversion.created_at >= month_start,
        )
    )
    month_purchase_row = month_purchases_q.one()

    # If this is an affiliate admin, also include admin commissions from team
    admin_commission = 0.0
    if affiliate.is_affiliate_admin:
        admin_comm_q = await db.execute(
            select(func.coalesce(func.sum(AffiliateConversion.affiliate_admin_commission), 0.0)).where(
                AffiliateConversion.affiliate_id.in_(
                    select(Affiliate.id).where(Affiliate.affiliate_admin_id == affiliate.id)
                ),
                AffiliateConversion.conversion_type == "purchase",
            )
        )
        admin_commission = admin_comm_q.scalar() or 0.0

    return AffiliateDashboardStats(
        total_clicks=affiliate.total_clicks,
        total_signups=affiliate.total_signups,
        total_purchases=total_purchases.scalar() or 0,
        total_revenue=affiliate.total_revenue,
        commission_earned=affiliate.commission_earned + admin_commission,
        commission_paid=affiliate.commission_paid,
        commission_balance=affiliate.commission_balance + admin_commission,
        month_clicks=month_clicks.scalar() or 0,
        month_signups=month_signups.scalar() or 0,
        month_purchases=month_purchase_row[0] or 0,
        month_commission=float(month_purchase_row[1] or 0),
    )


# ── Conversions ──────────────────────────────────────────────

@router.get("/conversions")
async def get_conversions(
    page: int = 1,
    limit: int = 20,
    conversion_type: Optional[str] = None,
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """List conversions with pagination."""
    query = select(AffiliateConversion).where(
        AffiliateConversion.affiliate_id == affiliate.id
    )
    if conversion_type:
        query = query.where(AffiliateConversion.conversion_type == conversion_type)

    query = query.order_by(AffiliateConversion.created_at.desc())

    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    conversions = result.scalars().all()

    # Enrich with user names (minimal info)
    items = []
    for conv in conversions:
        user_result = await db.execute(select(User.name).where(User.id == conv.user_id))
        user_name = user_result.scalar_one_or_none()
        items.append({
            "id": conv.id,
            "conversion_type": conv.conversion_type,
            "amount": conv.amount,
            "commission_amount": conv.commission_amount,
            "affiliate_admin_commission": conv.affiliate_admin_commission,
            "created_at": conv.created_at,
            "user_name": user_name,
        })

    return {"items": items, "total": total, "page": page, "limit": limit}


# ── Payouts ──────────────────────────────────────────────────

@router.get("/payouts")
async def get_payouts(
    page: int = 1,
    limit: int = 20,
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """List payout history."""
    query = (
        select(AffiliatePayout)
        .where(AffiliatePayout.affiliate_id == affiliate.id)
        .order_by(AffiliatePayout.created_at.desc())
    )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    payouts = result.scalars().all()

    return {
        "items": [PayoutResponse.model_validate(p) for p in payouts],
        "total": total,
        "page": page,
        "limit": limit,
    }


# ── Team (Affiliate Admin only) ──────────────────────────────

@router.get("/team")
async def get_team(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """Affiliate Admin: get all affiliates assigned to them."""
    if not affiliate.is_affiliate_admin:
        raise HTTPException(status_code=403, detail="Only affiliate admins can view team")

    result = await db.execute(
        select(Affiliate)
        .where(Affiliate.affiliate_admin_id == affiliate.id)
        .order_by(Affiliate.created_at.desc())
    )
    members = result.scalars().all()

    return {
        "members": [TeamMemberResponse.model_validate(m) for m in members],
        "total": len(members),
    }


@router.get("/team/stats")
async def get_team_stats(
    affiliate: Affiliate = Depends(get_current_affiliate),
    db: AsyncSession = Depends(get_db),
):
    """Affiliate Admin: aggregated team performance."""
    if not affiliate.is_affiliate_admin:
        raise HTTPException(status_code=403, detail="Only affiliate admins can view team stats")

    now = datetime.now(UTC).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Get IDs of team members
    team_ids_q = select(Affiliate.id).where(Affiliate.affiliate_admin_id == affiliate.id)
    team_result = await db.execute(team_ids_q)
    team_ids = [row[0] for row in team_result.all()]

    if not team_ids:
        return {
            "team_size": 0,
            "total_clicks": 0, "total_signups": 0, "total_revenue": 0.0,
            "total_admin_commission": 0.0, "month_admin_commission": 0.0,
        }

    # Aggregate team stats
    agg = await db.execute(
        select(
            func.sum(Affiliate.total_clicks),
            func.sum(Affiliate.total_signups),
            func.sum(Affiliate.total_revenue),
        ).where(Affiliate.id.in_(team_ids))
    )
    agg_row = agg.one()

    # Total admin commission earned from team
    total_admin_comm = await db.execute(
        select(func.coalesce(func.sum(AffiliateConversion.affiliate_admin_commission), 0.0))
        .where(
            AffiliateConversion.affiliate_id.in_(team_ids),
            AffiliateConversion.conversion_type == "purchase",
        )
    )

    # Monthly admin commission
    month_admin_comm = await db.execute(
        select(func.coalesce(func.sum(AffiliateConversion.affiliate_admin_commission), 0.0))
        .where(
            AffiliateConversion.affiliate_id.in_(team_ids),
            AffiliateConversion.conversion_type == "purchase",
            AffiliateConversion.created_at >= month_start,
        )
    )

    return {
        "team_size": len(team_ids),
        "total_clicks": agg_row[0] or 0,
        "total_signups": agg_row[1] or 0,
        "total_revenue": float(agg_row[2] or 0),
        "total_admin_commission": float(total_admin_comm.scalar() or 0),
        "month_admin_commission": float(month_admin_comm.scalar() or 0),
    }
