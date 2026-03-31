"""
Tips routes: CRUD for betting tips.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, date

from app.dependencies import get_db, get_current_user, get_current_user_optional, require_admin
from app.models.user import User
from app.models.tip import Tip
from app.schemas.tip import TipCreate, TipUpdate, TipResponse, TipLockedResponse, TipStatsResponse

router = APIRouter(prefix="/api/tips", tags=["Tips"])

# Tier access mapping
TIER_RANK = {"free": 0, "basic": 1, "standard": 2, "premium": 3}
CATEGORY_MIN_TIER = {
    "free": "free",
    "2+": "standard",
    "4+": "basic",
    "gg": "standard",
    "10+": "premium",
    "vip": "premium",
}


def user_has_access(user: Optional[User], category: str) -> bool:
    if category == "free":
        return True
    if not user:
        return False
    if not user.is_subscription_active:
        return False
    required = CATEGORY_MIN_TIER.get(category, "premium")
    return TIER_RANK.get(user.subscription_tier, 0) >= TIER_RANK.get(required, 3)


@router.get("", response_model=List)
async def list_tips(
    category: Optional[str] = Query(None),
    date_str: Optional[str] = Query(None, alias="date"),
    fixture_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    query = select(Tip)

    if category:
        query = query.where(Tip.category == category)

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

    response = []
    for tip in tips:
        if user_has_access(user, tip.category):
            response.append(TipResponse.model_validate(tip))
        else:
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
    decided = won + lost

    return TipStatsResponse(
        total=len(tips),
        won=won,
        lost=lost,
        pending=pending,
        voided=voided,
        win_rate=round((won / decided) * 100, 1) if decided > 0 else 0,
    )


@router.get("/{tip_id}", response_model=TipResponse)
async def get_tip(tip_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    if not user_has_access(user, tip.category):
        raise HTTPException(status_code=403, detail="Subscription required")
    return tip


@router.post("", response_model=TipResponse, status_code=201)
async def create_tip(body: TipCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
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
        is_premium=0 if body.category == "free" else 1,
    )
    db.add(tip)
    await db.commit()
    await db.refresh(tip)
    return tip


@router.put("/{tip_id}", response_model=TipResponse)
async def update_tip(tip_id: int, body: TipUpdate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Tip).where(Tip.id == tip_id))
    tip = result.scalar_one_or_none()
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")

    for field, value in body.model_dump(exclude_unset=True).items():
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
    await db.delete(tip)
    await db.commit()
