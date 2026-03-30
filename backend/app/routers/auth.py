"""
Authentication routes: register, login, refresh, me.
"""

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, RefreshRequest, TokenResponse, UserResponse, UpdateFavoritesRequest, PushSubscribeRequest
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
