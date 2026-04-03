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
from app.models.user import User
from app.models.setting import AdminSetting
from app.routers.admin import get_referral_settings
from app.models.activity import UserActivity, AnonymousVisitor, AnonymousActivity
from app.schemas.auth import GoogleLoginRequest, RefreshRequest, UserResponse, UpdateFavoritesRequest, PushSubscribeRequest, ActivityRequest
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
            
        user.session_id = uuid.uuid4().hex
        if not user.referral_code:
            # Generate a clean short referral code
            safe_name = "".join([c for c in user.name if c.isalpha()])[:3].upper()
            if len(safe_name) < 3: safe_name = "VIP"
            user.referral_code = f"{safe_name}{uuid.uuid4().hex[:5].upper()}"
            
        db.add(user)
        await db.commit()

        # Update login mechanics tracking IP and Geo via background tasks
        client_ip = get_real_ip(request)
        background_tasks.add_task(fetch_user_country, user.id, client_ip)

        # Issue securely with session tracking
        access_token = create_access_token(str(user.id), extra={"session_id": user.session_id})
        refresh_token = create_refresh_token(str(user.id))

        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=3600)
        response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=604800)

        return {"status": "success"}

    except ValueError as e:
        detail = f"Invalid Google Token: {e}" if settings.DEBUG else "Invalid identity token. Access denied."
        raise HTTPException(status_code=401, detail=detail)

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

    user.session_id = uuid.uuid4().hex
    db.add(user)
    await db.commit()

    access_token = create_access_token(str(user.id), extra={"session_id": user.session_id})
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
