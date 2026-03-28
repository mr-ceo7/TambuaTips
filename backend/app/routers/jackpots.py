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
from app.schemas.jackpot import JackpotCreate, JackpotResponse, JackpotLockedResponse

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
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Jackpot).order_by(Jackpot.created_at.desc()))
    jackpots = result.scalars().all()

    response = []
    for jp in jackpots:
        has_access = await user_has_jackpot_access(user, jp.id, db)
        if has_access:
            response.append(JackpotResponse.model_validate(jp))
        else:
            response.append(JackpotLockedResponse(
                id=jp.id,
                type=jp.type,
                dc_level=jp.dc_level,
                match_count=len(jp.matches) if jp.matches else 0,
                price=jp.price,
                created_at=jp.created_at,
            ))
    return response


@router.get("/{jackpot_id}")
async def get_jackpot(
    jackpot_id: int,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Jackpot).where(Jackpot.id == jackpot_id))
    jp = result.scalar_one_or_none()
    if not jp:
        raise HTTPException(status_code=404, detail="Jackpot not found")

    has_access = await user_has_jackpot_access(user, jp.id, db)
    if has_access:
        return JackpotResponse.model_validate(jp)
    else:
        return JackpotLockedResponse(
            id=jp.id,
            type=jp.type,
            dc_level=jp.dc_level,
            match_count=len(jp.matches) if jp.matches else 0,
            price=jp.price,
            created_at=jp.created_at,
        )


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


@router.delete("/{jackpot_id}", status_code=204)
async def delete_jackpot(jackpot_id: int, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    result = await db.execute(select(Jackpot).where(Jackpot.id == jackpot_id))
    jp = result.scalar_one_or_none()
    if not jp:
        raise HTTPException(status_code=404, detail="Jackpot not found")
    await db.delete(jp)
    await db.commit()
