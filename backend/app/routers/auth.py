"""
Authentication routes: register, login, refresh, me.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from datetime import datetime, timedelta, UTC
import random
import os
import string
import uuid
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user, get_current_user_optional, get_unverified_user
from app.models.user import User, UserSession
from app.models.setting import AdminSetting
from app.config import settings
from app.routers.admin import get_referral_settings, get_sms_settings
from app.models.activity import UserActivity, AnonymousVisitor, AnonymousActivity
from app.schemas.auth import GoogleLoginRequest, PhoneLoginRequest, PhoneVerifyRequest, RefreshRequest, UserResponse, UpdateFavoritesRequest, PushSubscribeRequest, ActivityRequest
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.services.email_service import send_welcome_email

def get_real_ip(request: Request) -> str:
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    x_real_ip = request.headers.get("x-real-ip")
    if x_real_ip:
        return x_real_ip.strip()
    return request.client.host if request.client else ""

async def create_user_session(user: User, db: AsyncSession) -> tuple[str, str]:
    """
    Create a new session for a user, handling admin multi-device limits.
    - Admins can have up to 4 active sessions
    - Regular users have only 1 active session (old one is deleted)
    
    Returns:
        Tuple of (session_id, access_token)
    """
    MAX_ADMIN_SESSIONS = 4
    MAX_REGULAR_SESSIONS = 1
    
    session_id = uuid.uuid4().hex
    max_sessions = MAX_ADMIN_SESSIONS if user.is_admin else MAX_REGULAR_SESSIONS
    
    # For non-admins, delete the old session first
    if not user.is_admin and user.sessions:
        for old_session in user.sessions:
            await db.delete(old_session)
        await db.commit()  # Commit deletions first
        # Refresh user to clear relationship cache
        await db.refresh(user)
    
    # Create new session
    new_session = UserSession(
        user_id=user.id,
        session_id=session_id,
        created_at=datetime.now(UTC).replace(tzinfo=None),
        last_used_at=datetime.now(UTC).replace(tzinfo=None)
    )
    db.add(new_session)
    
    # For admins, enforce max sessions by deleting oldest if limit exceeded
    if user.is_admin:
        # Get all sessions ordered by creation time (oldest first)
        result = await db.execute(
            select(UserSession).where(UserSession.user_id == user.id).order_by(UserSession.created_at)
        )
        sessions = result.scalars().all()
        
        # Delete oldest sessions if we exceed the limit
        if len(sessions) >= max_sessions:
            for old_session in sessions[:len(sessions) - max_sessions + 1]:
                await db.delete(old_session)
            await db.commit()  # Commit deletions first
            # Refresh user to clear relationship cache
            await db.refresh(user)
    
    await db.commit()
    
    # Keep session_id in user model for backward compatibility (will be cleaned up later)
    user.session_id = session_id
    db.add(user)
    await db.commit()
    
    return session_id


async def cleanup_expired_sessions(user: User, db: AsyncSession):
    """
    Clean up inactive/expired sessions for a user.
    Removes sessions that haven't been used for 7+ days (matching refresh token expiry).
    """
    from datetime import timedelta
    expiry_threshold = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=7)
    
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.last_used_at < expiry_threshold
        )
    )
    expired_sessions = result.scalars().all()
    
    for session in expired_sessions:
        await db.delete(session)
    
    if expired_sessions:
        await db.commit()

router = APIRouter(prefix="/api/auth", tags=["Auth"])

async def fetch_user_country(user_id: int, ip_address: str):
    if not ip_address or ip_address in ("127.0.0.1", "::1", "localhost"):
        # Fallback for local development testing
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get("https://api.ipify.org")
                ip_address = res.text.strip()
        except Exception:
            return
            
    if not ip_address:
        return
        
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"http://ip-api.com/json/{ip_address}")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    async with AsyncSessionLocal() as session:
                        user = await session.get(User, user_id)
                        if user:
                            user.country = data.get("countryCode")
                            session.add(user)
                            await session.commit()
    except Exception as e:
        print(f"IP Geolocation failed: {e}")

@router.post("/google")
async def google_auth(body: GoogleLoginRequest, request: Request, response: Response, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    try:
        # Validate Google token
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        idinfo = id_token.verify_oauth2_token(body.id_token, google_requests.Request(), client_id)
        
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")
        
        if not email:
            raise HTTPException(status_code=400, detail="No email provided in Google Token")
            
        # Check if user exists
        result = await db.execute(select(User).where(User.email == email.lower().strip()))
        user = result.scalar_one_or_none()
        
        if not user:
            # Auto-register Google users and instantly mark as active
            rand_pass = "".join(random.choices(string.ascii_letters + string.digits, k=32))
            
            user = User(
                name=name.strip(),
                email=email.lower().strip(),
                password=hash_password(rand_pass),
                subscription_tier="free",
                is_admin=False,
                is_active=True,
                email_verified_at=datetime.now(UTC).replace(tzinfo=None),
                profile_picture=picture
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            # Dispatch welcome email asynchronously 
            background_tasks.add_task(send_welcome_email, user.email, user.name)

            # Referral Fulfillment
            if body.referred_by_code:
                result_ref = await db.execute(select(User).where(User.referral_code == body.referred_by_code).with_for_update())
                referrer = result_ref.scalar_one_or_none()
                if referrer and referrer.id != user.id:
                    ref_settings = await get_referral_settings(db)
                    
                    if ref_settings.get("referral_enabled", True):
                        user.referrer_id = referrer.id
                        
                        referrer.referrals_count += 1
                        
                        reward_days = ref_settings.get("referral_reward_days", 7)
                        reward_tier = ref_settings.get("referral_reward_tier", "basic")

                        # Grant referrer: set BOTH tier and expiry (fixes critical bug)
                        referrer.subscription_tier = reward_tier
                        if not referrer.subscription_expires_at or referrer.subscription_expires_at < datetime.now(UTC).replace(tzinfo=None):
                            referrer.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=reward_days)
                        else:
                            referrer.subscription_expires_at += timedelta(days=reward_days)
                        
                        # Conditionally reward the new user too (admin-controlled)
                        if ref_settings.get("referral_new_user_reward", False):
                            new_user_days = ref_settings.get("referral_new_user_reward_days", 7)
                            new_user_tier = ref_settings.get("referral_new_user_reward_tier", "basic")
                            user.subscription_tier = new_user_tier
                            user.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=new_user_days)
                        
                        db.add(referrer)
                        db.add(user)
                        await db.commit()

        # Update dynamic fields (Profile Pic update if changed, Session ID rotation)
        if picture and user.profile_picture != picture:
            user.profile_picture = picture
            
        if not user.referral_code:
            # Generate a clean short referral code
            safe_name = "".join([c for c in user.name if c.isalpha()])[:3].upper()
            if len(safe_name) < 3: safe_name = "VIP"
            user.referral_code = f"{safe_name}{uuid.uuid4().hex[:5].upper()}"
            
        db.add(user)
        await db.commit()

        # Clean up expired sessions before creating new one
        await cleanup_expired_sessions(user, db)

        # Create new session (handles multi-device logic)
        session_id = await create_user_session(user, db)

        # Update login mechanics tracking IP and Geo via background tasks
        client_ip = get_real_ip(request)
        background_tasks.add_task(fetch_user_country, user.id, client_ip)

        # Issue securely with session tracking
        access_token = create_access_token(str(user.id), extra={"session_id": session_id})
        refresh_token = create_refresh_token(str(user.id))

        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600)
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800)

        return {"status": "success"}

    except ValueError as e:
        detail = f"Invalid Google Token: {e}" if settings.DEBUG else "Invalid identity token. Access denied."
        raise HTTPException(status_code=401, detail=detail)
    except Exception as e:
        import logging
        logging.error(f"Google Auth Error: {e}")
        if "retries exceeded" in str(e) or "Temporary failure" in str(e):
            raise HTTPException(status_code=502, detail="Could not reach Google securely to verify login. Please check network connection.")
        raise HTTPException(status_code=500, detail="An unexpected authentication error occurred.")

import re
import logging as _logging

def _normalize_phone(phone: str) -> str:
    """Strip spaces/dashes, ensure it starts with +"""
    phone = re.sub(r'[\s\-\(\)]', '', phone)
    if not phone.startswith('+'):
        phone = '+' + phone
    return phone

async def _get_sms_src(db: AsyncSession) -> str:
    """
    Fetch the SMS sender ID (src) from admin settings.
    Defaults to 'ARVOCAP' if not configured.
    """
    sms_settings = await get_sms_settings(db)
    return sms_settings.get("SMS_SRC", "ARVOCAP")


async def _send_otp_sms(phone: str, code: str, db: AsyncSession):
    """
    Send OTP via custom SMS provider (trackomgroup.com).
    
    API Endpoint: https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php
    Parameters:
    - src: Sender ID (configurable via admin settings)
    - phone_number: Phone number without + prefix (e.g., 254746957502)
    - sms_message: Message content
    
    Phone format: Strip + and format as just digits (e.g., +254712345678 → 254712345678)
    """
    try:
        # Get SMS sender ID from admin settings
        sms_src = await _get_sms_src(db)
        
        # Strip phone to just digits (remove + and spaces)
        stripped_phone = re.sub(r'[\D]', '', phone)  # Keep only digits
        
        # Craft SMS message
        sms_message = f"Your TambuaTips verification code is: {code}"
        
        # Build request to SMS provider
        sms_url = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"
        params = {
            "src": sms_src,
            "phone_number": stripped_phone,
            "sms_message": sms_message
        }
        
        # Send SMS asynchronously
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(sms_url, params=params)
            
            if response.status_code == 200:
                _logging.info(f"SMS sent successfully to {stripped_phone}")
            else:
                _logging.warning(f"SMS provider returned status {response.status_code} for {stripped_phone}")
    
    except Exception as e:
        # Log error but don't crash the OTP request flow
        _logging.error(f"Failed to send OTP SMS to {phone}: {e}")
        # Still allow OTP to be created even if SMS fails
        pass

@router.post("/phone/request-otp")
async def request_phone_otp(body: PhoneLoginRequest, db: AsyncSession = Depends(get_db)):
    phone = _normalize_phone(body.phone)
    
    if len(phone) < 10 or len(phone) > 15:
        raise HTTPException(status_code=400, detail="Invalid phone number format")

    # Find or prepare user
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()

    # Generate 6-digit OTP
    code = "".join(random.choices(string.digits, k=6))
    expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(minutes=5)

    if user:
        user.verification_code = code
        user.verification_code_expires_at = expires_at
        db.add(user)
    else:
        # Create a minimal placeholder user (will be fully set up on verify)
        placeholder_email = f"phone_{phone.replace('+', '')}@tambuatips.local"
        rand_pass = "".join(random.choices(string.ascii_letters + string.digits, k=32))
        user = User(
            name=f"User {phone[-4:]}",
            email=placeholder_email,
            password=hash_password(rand_pass),
            phone=phone,
            subscription_tier="free",
            is_active=True,
            verification_code=code,
            verification_code_expires_at=expires_at,
        )
        db.add(user)
    
    await db.commit()
    
    # Send OTP via SMS provider
    await _send_otp_sms(phone, code, db)
    
    return {"status": "success", "message": "OTP sent"}


@router.post("/phone/verify-otp")
async def verify_phone_otp(body: PhoneVerifyRequest, request: Request, response: Response, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    phone = _normalize_phone(body.phone)
    
    result = await db.execute(select(User).where(User.phone == phone))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="No OTP was requested for this number")
    
    if not user.verification_code or not user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="No pending OTP. Please request a new one.")
    
    if datetime.now(UTC).replace(tzinfo=None) > user.verification_code_expires_at:
        raise HTTPException(status_code=400, detail="OTP has expired. Please request a new one.")
    
    if user.verification_code != body.code:
        raise HTTPException(status_code=400, detail="Invalid OTP code")
    
    # OTP is valid — clear it
    user.verification_code = None
    user.verification_code_expires_at = None
    
    # Mark verified
    if not user.email_verified_at:
        user.email_verified_at = datetime.now(UTC).replace(tzinfo=None)
    
    # Referral fulfillment (same logic as Google auth)
    is_new_user = user.referral_code is None
    if is_new_user and body.referred_by_code:
        result_ref = await db.execute(select(User).where(User.referral_code == body.referred_by_code).with_for_update())
        referrer = result_ref.scalar_one_or_none()
        if referrer and referrer.id != user.id:
            ref_settings = await get_referral_settings(db)
            if ref_settings.get("referral_enabled", True):
                user.referrer_id = referrer.id
                referrer.referrals_count += 1
                reward_days = ref_settings.get("referral_reward_days", 7)
                reward_tier = ref_settings.get("referral_reward_tier", "basic")
                referrer.subscription_tier = reward_tier
                if not referrer.subscription_expires_at or referrer.subscription_expires_at < datetime.now(UTC).replace(tzinfo=None):
                    referrer.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=reward_days)
                else:
                    referrer.subscription_expires_at += timedelta(days=reward_days)
                
                if ref_settings.get("referral_new_user_reward", False):
                    new_user_days = ref_settings.get("referral_new_user_reward_days", 7)
                    new_user_tier = ref_settings.get("referral_new_user_reward_tier", "basic")
                    user.subscription_tier = new_user_tier
                    user.subscription_expires_at = datetime.now(UTC).replace(tzinfo=None) + timedelta(days=new_user_days)
                
                db.add(referrer)

    # Session management
    if not user.referral_code:
        safe_name = "".join([c for c in user.name if c.isalpha()])[:3].upper()
        if len(safe_name) < 3: safe_name = "VIP"
        user.referral_code = f"{safe_name}{uuid.uuid4().hex[:5].upper()}"
    
    db.add(user)
    await db.commit()

    # Clean up expired sessions before creating new one
    await cleanup_expired_sessions(user, db)

    # Create new session (handles multi-device logic)
    session_id = await create_user_session(user, db)

    # Geo lookup
    client_ip = get_real_ip(request)
    background_tasks.add_task(fetch_user_country, user.id, client_ip)

    # Issue JWT tokens (identical to Google flow)
    access_token = create_access_token(str(user.id), extra={"session_id": session_id})
    refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800)

    return {"status": "success"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", samesite="none", secure=True)
    response.delete_cookie("refresh_token", samesite="none", secure=True)
    return {"status": "success"}


@router.post("/refresh")
async def refresh(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing from cookies")
        
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Create new session (handles multi-device logic)
    session_id = await create_user_session(user, db)

    access_token = create_access_token(str(user.id), extra={"session_id": session_id})
    new_refresh_token = create_refresh_token(str(user.id))

    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600)
    response.set_cookie(key="refresh_token", value=new_refresh_token, httponly=True, secure=True, samesite="none", max_age=604800)

    return {"status": "success"}


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return user


@router.put("/me/favorites", response_model=UserResponse)
async def update_favorites(
    body: UpdateFavoritesRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user.favorite_teams = body.favorite_teams
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/me/push-subscribe", response_model=UserResponse)
async def push_subscribe(
    body: PushSubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    current_subs = user.push_subscriptions if isinstance(user.push_subscriptions, list) else []
    
    # Check if duplicate (same endpoint)
    exists = any(sub.get("endpoint") == body.endpoint for sub in current_subs)
    
    if not exists:
        new_sub = {
            "endpoint": body.endpoint,
            "keys": body.keys
        }
        user.push_subscriptions = current_subs + [new_sub]
        db.add(user)
        await db.commit()
        await db.refresh(user)
        
    return user

async def cleanup_old_visitors_task():
    try:
        async with AsyncSessionLocal() as session:
            cutoff = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=30)
            await session.execute(delete(AnonymousVisitor).where(AnonymousVisitor.last_seen < cutoff))
            await session.commit()
    except Exception as e:
        print(f"Cleanup error: {e}")

@router.post("/activity")
async def track_activity(
    body: ActivityRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    import random
    if random.random() < 0.05:  # 5% chance to trigger cleanup to avoid cron dependency
        background_tasks.add_task(cleanup_old_visitors_task)

    if user:
        # 1. Update heartbeat
        user.last_seen = datetime.now(UTC).replace(tzinfo=None)
        db.add(user)
        
        # 2. Log activity
        if body.time_spent > 0 and body.path:
            act = UserActivity(
                user_id=user.id,
                path=body.path,
                time_spent_seconds=body.time_spent
            )
            db.add(act)
    elif body.session_id:
        # Handle anonymous visitor
        res = await db.execute(select(AnonymousVisitor).where(AnonymousVisitor.session_id == body.session_id))
        visitor = res.scalar_one_or_none()
        
        if not visitor:
            visitor = AnonymousVisitor(session_id=body.session_id)
            db.add(visitor)
            await db.commit()
            await db.refresh(visitor)
            
        visitor.last_seen = datetime.now(UTC).replace(tzinfo=None)
        db.add(visitor)
        
        if body.time_spent > 0 and body.path:
            act = AnonymousActivity(
                visitor_id=visitor.id,
                path=body.path,
                time_spent_seconds=body.time_spent
            )
            db.add(act)
        
    await db.commit()
    return {"status": "ok"}
