"""
Admin routes — privileged operations.
"""

from typing import List, Optional
import json
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, require_admin
from app.models.user import User
from app.models.payment import Payment
from app.schemas.auth import UserResponse
from app.schemas.payment import PaymentResponse
from app.config import settings
from pywebpush import webpush, WebPushException
from sqlalchemy import and_

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return result.scalars().all()


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

def send_webpush_task(subscriptions: list, payload: str):
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
    if request.target_tier in ("free", "premium"):
        filters.append(User.subscription_tier == request.target_tier)
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
            
    payload = json.dumps({
        "title": request.title,
        "body": request.body,
        "icon": request.icon,
        "url": request.url
    })
    
    background_tasks.add_task(send_webpush_task, all_subs, payload)
    
    return {"message": "Broadcast queued", "targeted_users": len(users), "total_subscriptions": len(all_subs)}
