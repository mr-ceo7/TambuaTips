"""
Jackpot routes: CRUD for jackpot predictions.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.dependencies import get_db, get_current_user, get_current_user_optional, require_admin
from app.models.user import User
from app.models.jackpot import Jackpot, JackpotPurchase
from app.schemas.jackpot import JackpotCreate, JackpotUpdate, JackpotResponse, JackpotLockedResponse
from app.services.pricing import get_pricing_region
from fastapi import Query

router = APIRouter(prefix="/api/jackpots", tags=["Jackpots"])


async def user_has_jackpot_access(user: Optional[User], jackpot_id: int, db: AsyncSession) -> bool:
    if not user:
        return False
    # Premium subscribers get all jackpots
    if user.is_subscription_active and user.subscription_tier == "premium":
        return True
    # Check individual purchase
    result = await db.execute(
        select(JackpotPurchase).where(
            JackpotPurchase.user_id == user.id,
            JackpotPurchase.jackpot_id == jackpot_id,
        )
    )
    return result.scalar_one_or_none() is not None


@router.get("", response_model=List)
async def list_jackpots(
    country: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Jackpot).order_by(Jackpot.created_at.desc()))
    jackpots = result.scalars().all()
    
    # Resolve pricing region
    region = await get_pricing_region(db, country or "US")

    response = []
    for jp in jackpots:
        jp_dict = jp.__dict__.copy()
        
        # Determine override
        if region and jp.regional_prices and region.region_code in jp.regional_prices:
            overrides = jp.regional_prices[region.region_code]
            jp_dict["price"] = overrides.get("price", jp.price)
            
        jp_dict["currency"] = region.currency if region else "KES"
        jp_dict["currency_symbol"] = region.currency_symbol if region else "KES"

        has_access = await user_has_jackpot_access(user, jp.id, db)
        if has_access:
            response.append(JackpotResponse.model_validate(jp_dict))
        else:
            jp_dict["match_count"] = len(jp_dict.get("matches", []))
            jp_dict["locked"] = True
            response.append(JackpotLockedResponse.model_validate(jp_dict))
            
    return response


@router.get("/{jackpot_id}")
async def get_jackpot(
    jackpot_id: int,
    country: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Jackpot).where(Jackpot.id == jackpot_id))
    jp = result.scalar_one_or_none()
    if not jp:
        raise HTTPException(status_code=404, detail="Jackpot not found")

    jp_dict = jp.__dict__.copy()
    
    region = await get_pricing_region(db, country or "US")
    if region and jp.regional_prices and region.region_code in jp.regional_prices:
        overrides = jp.regional_prices[region.region_code]
        jp_dict["price"] = overrides.get("price", jp.price)
        
    jp_dict["currency"] = region.currency if region else "KES"
    jp_dict["currency_symbol"] = region.currency_symbol if region else "KES"

    has_access = await user_has_jackpot_access(user, jp.id, db)
    if has_access:
        return JackpotResponse.model_validate(jp_dict)
    else:
        jp_dict["match_count"] = len(jp_dict.get("matches", []))
        jp_dict["locked"] = True
        return JackpotLockedResponse.model_validate(jp_dict)


@router.post("", response_model=JackpotResponse, status_code=201)
async def create_jackpot(body: JackpotCreate, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    jp = Jackpot(
        type=body.type,
        dc_level=body.dc_level,
        matches=[m.model_dump() for m in body.matches],
        price=body.price,
    )
    db.add(jp)
    await db.commit()
    await db.refresh(jp)
    return jp


@router.put("/{jackpot_id}", response_model=JackpotResponse)
async def update_jackpot(
    jackpot_id: int,
    body: JackpotUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(Jackpot).where(Jackpot.id == jackpot_id))
    jp = result.scalar_one_or_none()
    if not jp:
        raise HTTPException(status_code=404, detail="Jackpot not found")

    if body.type is not None:
        jp.type = body.type
    if body.dc_level is not None:
        jp.dc_level = body.dc_level
    if body.price is not None:
        jp.price = body.price
    if body.result is not None:
        jp.result = body.result
    if body.regional_prices is not None:
        jp.regional_prices = body.regional_prices
    if body.matches is not None:
        jp.matches = [m.model_dump() for m in body.matches]

    await db.commit()
    await db.refresh(jp)
    return jp


@router.delete("/{jackpot_id}", status_code=204)
async def delete_jackpot(jackpot_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Jackpot).where(Jackpot.id == jackpot_id))
    jp = result.scalar_one_or_none()
    if not jp:
        raise HTTPException(status_code=404, detail="Jackpot not found")
    await db.delete(jp)
    await db.commit()
