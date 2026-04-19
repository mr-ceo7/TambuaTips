"""
Tips routes: CRUD for betting tips.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from datetime import datetime, date

from app.dependencies import get_db, get_current_user, get_current_user_optional, require_admin
from app.models.user import User
from app.models.tip import Tip
from app.models.sms_tip import SmsTipQueue
from app.schemas.tip import TipCreate, TipUpdate, TipResponse, TipLockedResponse, TipStatsResponse
from pydantic import BaseModel
from fastapi import BackgroundTasks
from app.services.sms_tip_delivery import queue_tip_sms_for_tip, flush_pending_sms_tip_bundles
from app.services.subscription_access import get_active_tier_ids, user_has_category_access

router = APIRouter(prefix="/api/tips", tags=["Tips"])


class FlushTipSmsQueueRequest(BaseModel):
    tip_ids: Optional[List[int]] = None

from app.models.subscription import SubscriptionTier


def user_has_access(user: Optional[User], tip: Tip, tier_dict: dict) -> bool:
    return user_has_category_access(user, getattr(tip, "category", ""), tier_dict.values())


@router.get("", response_model=List)
async def list_tips(
    category: Optional[str] = Query(None),
    is_free: Optional[bool] = Query(None),
    date_str: Optional[str] = Query(None, alias="date"),
    fixture_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = select(Tip)

    if category:
        query = query.where(Tip.category == category)
        
    if is_free is not None:
        query = query.where(Tip.is_premium == (0 if is_free else 1))

    if date_str == "all":
        pass  # Admin fetching everything
    elif date_str:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        query = query.where(func.date(Tip.match_date) == target_date)
    else:
        # If no date string is provided, show recent and upcoming tips (no strict equality)
        # We'll just limit to the latest 50 tips per request instead of hiding perfectly good tips
        pass

    if fixture_id:
        query = query.where(Tip.fixture_id == fixture_id)
    query = query.order_by(Tip.match_date.desc(), Tip.created_at.desc()).limit(100)

    result = await db.execute(query)
    tips = result.scalars().all()

    # Fetch tiers for access check
    result_tiers = await db.execute(select(SubscriptionTier))
    all_tiers = result_tiers.scalars().all()
    tier_dict = {t.tier_id: t for t in all_tiers}

    response = []

    # Pre-calculate if the user is Premium/Admin to bypass the marketing filters
    active_tiers = get_active_tier_ids(user) if user else set()
    is_premium_or_admin = bool(user and (user.is_admin or "premium" in active_tiers))
    lost_counter = 0

    for tip in tips:
        has_normal_access = user_has_access(user, tip, tier_dict)
        is_decided = tip.result in ["won", "lost", "void", "postponed"]

        # CONVERSION BOOST: If a non-premium user is looking at historical tips,
        # we purposely drop 3 out of every 4 "lost" tips to curate an overwhelming "won" feed.
        if is_decided and not is_premium_or_admin and tip.result == "lost":
            lost_counter += 1
            if lost_counter % 4 != 0:
                continue

        # Check if the user has specifically unlocked this tip via their referral points
        is_specifically_unlocked = user and tip.id in (user.unlocked_tip_ids or [])

        # Full access: decided tips visible to everyone, or user has subscription/unlock
        if is_decided or has_normal_access or is_specifically_unlocked:
            response.append(TipResponse.model_validate(tip))
        else:
            # Locked response — hide prediction/odds/reasoning for pending tips
            response.append(TipLockedResponse(
                id=tip.id,
                fixture_id=tip.fixture_id,
                home_team=tip.home_team,
                away_team=tip.away_team,
                league=tip.league,
                match_date=tip.match_date,
                category=tip.category,
                is_premium=tip.is_premium,
                result=tip.result,
                created_at=tip.created_at,
                # These fields are explicitly overridden to ensure no leakage
                prediction="🔒 Locked",
                odds="🔒",
                bookmaker="",
                bookmaker_odds=None,
                confidence=0,
                reasoning=None
            ))
    return response


@router.get("/stats", response_model=TipStatsResponse)
async def tip_stats(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Tip))
    tips = result.scalars().all()

    won = sum(1 for t in tips if t.result == "won")
    lost = sum(1 for t in tips if t.result == "lost")
    pending = sum(1 for t in tips if t.result == "pending")
    voided = sum(1 for t in tips if t.result == "void")
    postponed = sum(1 for t in tips if t.result == "postponed")
    decided = won + lost

    return TipStatsResponse(
        total=len(tips),
        won=won,
        lost=lost,
        pending=pending,
        voided=voided,
        postponed=postponed,
        win_rate=round((won / decided) * 100, 1) if decided > 0 else 0,
    )


@router.get("/{tip_id}", response_model=TipResponse)
async def get_tip(tip_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
        
    result_tiers = await db.execute(select(SubscriptionTier))
    all_tiers = result_tiers.scalars().all()
    tier_dict = {t.tier_id: t for t in all_tiers}

    if not user_has_access(user, tip, tier_dict):
        raise HTTPException(status_code=403, detail="Subscription required")
    return tip


@router.post("", response_model=TipResponse, status_code=201)
async def create_tip(body: TipCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    tip = Tip(
        fixture_id=body.fixture_id,
        home_team=body.home_team,
        away_team=body.away_team,
        league=body.league,
        match_date=body.match_date,
        prediction=body.prediction,
        odds=body.odds,
        bookmaker=body.bookmaker,
        bookmaker_odds=[bo.model_dump() for bo in body.bookmaker_odds] if body.bookmaker_odds else None,
        confidence=body.confidence,
        reasoning=body.reasoning,
        category=body.category,
        is_premium=0 if getattr(body, "is_free", False) else 1,
    )
    db.add(tip)
    await db.commit()
    await db.refresh(tip)
    background_tasks.add_task(queue_tip_sms_for_tip, tip.id)
    
    if body.notify:
        from app.routers.admin import broadcast_push, BroadcastPushRequest
        # Catchy notification draft
        msg_title = f"🔥 New {body.category.upper()} Tip Posted!"
        msg_body = f"We just dropped a new {body.category.upper()} prediction: {body.home_team} vs {body.away_team} in the {body.league}. Log in now to view it and smash the bookies!"
        
        req = BroadcastPushRequest(
            title=msg_title,
            body=msg_body,
            icon="/tambua-logo.jpg",
            url="/tips",
            target_tier=body.notify_target,
            target_country="all",
            delivery_method=body.notify_channel
        )
        try:
            await broadcast_push(req, background_tasks, db, admin)
        except Exception as e:
            print("Auto-broadcast failed:", e)
            
    return tip


@router.post("/flush-sms-queue")
async def flush_tip_sms_queue(
    body: FlushTipSmsQueueRequest,
    admin: User = Depends(require_admin),
):
    result = await flush_pending_sms_tip_bundles(tip_ids=body.tip_ids or None)
    return {
        "status": "success",
        **result,
    }


@router.put("/{tip_id}", response_model=TipResponse)
async def update_tip(tip_id: int, body: TipUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")

    dumped_data = body.model_dump(exclude_unset=True)
    if "is_free" in dumped_data:
        setattr(tip, "is_premium", 0 if dumped_data.pop("is_free") else 1)

    for field, value in dumped_data.items():
        setattr(tip, field, value)

    await db.commit()
    await db.refresh(tip)
    return tip


@router.delete("/{tip_id}", status_code=204)
async def delete_tip(tip_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    await db.execute(delete(SmsTipQueue).where(SmsTipQueue.tip_id == tip_id))
    await db.delete(tip)
    await db.commit()
