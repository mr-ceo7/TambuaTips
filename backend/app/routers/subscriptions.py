"""
Subscription routes: list pricing tiers and subscribe.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.subscription import SubscriptionTier
from app.schemas.subscription import SubscriptionTierResponse, SubscribeRequest
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/subscriptions", tags=["Subscriptions"])


@router.get("/tiers", response_model=List[SubscriptionTierResponse])
async def list_tiers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SubscriptionTier).order_by(SubscriptionTier.price_2wk.asc()))
    return result.scalars().all()


@router.get("/me")
async def my_subscription(user: User = Depends(get_current_user)):
    return {
        "tier": user.subscription_tier,
        "expires_at": user.subscription_expires_at,
        "is_active": user.is_subscription_active,
    }
