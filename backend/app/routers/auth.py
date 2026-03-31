"""
Authentication routes: register, login, refresh, me.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user, get_current_user_optional
from app.models.user import User
from app.models.activity import UserActivity, AnonymousVisitor, AnonymousActivity
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse, UserResponse, UpdateFavoritesRequest, PushSubscribeRequest, ActivityRequest
from app.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

async def fetch_user_country(user_id: int, ip_address: str):
    if not ip_address or ip_address in ("127.0.0.1", "::1", "localhost"):
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

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == body.email.lower().strip()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        password=hash_password(body.password),
        subscription_tier="free",
        is_admin=False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    background_tasks.add_task(fetch_user_country, user.id, request.client.host if request.client else "")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.lower().strip()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    background_tasks.add_task(fetch_user_country, user.id, request.client.host if request.client else "")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
    )


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
        from sqlalchemy import delete
        import datetime as dt
        async with AsyncSessionLocal() as session:
            cutoff = dt.datetime.utcnow() - dt.timedelta(days=30)
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
        user.last_seen = datetime.utcnow()
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
            
        visitor.last_seen = datetime.utcnow()
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
