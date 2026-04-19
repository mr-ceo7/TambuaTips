import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, UTC, timedelta

from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.tip import Tip
from app.routers.admin import get_referral_settings
from app.services.subscription_access import grant_subscription_entitlement

router = APIRouter(prefix="/api/rewards", tags=["Rewards"])

class RedeemRequest(BaseModel):
    action: str  # "unlock_tip", "get_discount", "get_premium"
    tip_id: Optional[int] = None

@router.get("/config")
async def get_rewards_config(db: AsyncSession = Depends(get_db)):
    ref_settings = await get_referral_settings(db)
    return {
        "points_per_tip": ref_settings.get("points_per_tip", 2),
        "points_per_discount": ref_settings.get("points_per_discount", 5),
        "discount_percentage": ref_settings.get("discount_percentage", 50),
        "points_per_premium": ref_settings.get("points_per_premium", 10),
        "premium_days_reward": ref_settings.get("premium_days_reward", 7),
    }

@router.post("/redeem")
async def redeem_points(body: RedeemRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    ref_settings = await get_referral_settings(db)
    
    if not ref_settings.get("referral_enabled", True):
        raise HTTPException(status_code=400, detail="Rewards system is currently disabled.")

    points = current_user.referral_points

    if body.action == "unlock_tip":
        if not body.tip_id:
            raise HTTPException(status_code=400, detail="tip_id is required for unlock_tip action.")
            
        cost = ref_settings.get("points_per_tip", 2)
        if points < cost:
            raise HTTPException(status_code=400, detail=f"Insufficient points. Need {cost} points.")
            
        # Check if tip exists
        result = await db.execute(select(Tip).where(Tip.id == body.tip_id))
        tip = result.scalar_one_or_none()
        if not tip:
            raise HTTPException(status_code=404, detail="Tip not found.")
            
        unlocked = current_user.unlocked_tip_ids or []
        if body.tip_id in unlocked:
            raise HTTPException(status_code=400, detail="You have already unlocked this tip.")
            
        # Deduct and grant access
        current_user.referral_points -= cost
        unlocked.append(body.tip_id)
        # Re-assign to trigger SQLAlchemy JSON mutability tracking
        current_user.unlocked_tip_ids = list(unlocked)
        db.add(current_user)
        await db.commit()
        return {"status": "success", "message": "Tip unlocked successfully!", "points": current_user.referral_points}

    elif body.action == "get_discount":
        cost = ref_settings.get("points_per_discount", 5)
        if points < cost:
            raise HTTPException(status_code=400, detail=f"Insufficient points. Need {cost} points.")
            
        if current_user.referral_discount_active:
            raise HTTPException(status_code=400, detail="You already have an active discount coupon!")
            
        current_user.referral_points -= cost
        current_user.referral_discount_active = True
        db.add(current_user)
        await db.commit()
        return {"status": "success", "message": "50% Discount activated! It will apply to your next purchase.", "points": current_user.referral_points}

    elif body.action == "get_premium":
        cost = ref_settings.get("points_per_premium", 10)
        if points < cost:
            raise HTTPException(status_code=400, detail=f"Insufficient points. Need {cost} points.")
            
        days = ref_settings.get("premium_days_reward", 7)
        
        current_user.referral_points -= cost
        
        grant_subscription_entitlement(
            current_user,
            tier_id="basic",
            duration_days=days,
            source="referral_reward",
        )
            
        db.add(current_user)
        await db.commit()
        return {"status": "success", "message": f"{days} Days of Premium activated successfully!", "points": current_user.referral_points}

    else:
        raise HTTPException(status_code=400, detail="Invalid redemption action.")
