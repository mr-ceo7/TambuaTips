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
from app.models.activity import UserActivity
from app.schemas.auth import UserResponse, AdminUserResponse
from app.schemas.payment import PaymentResponse
from app.config import settings
from pywebpush import webpush, WebPushException
from sqlalchemy import and_, func
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/admin", tags=["Admin"])


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
