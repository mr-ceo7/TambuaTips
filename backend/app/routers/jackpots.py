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
from app.models.setting import AdminSetting
from app.schemas.jackpot import JackpotCreate, JackpotUpdate, JackpotResponse, JackpotLockedResponse
from app.services.pricing import get_pricing_region
from datetime import datetime, timedelta, UTC
from fastapi import Query, BackgroundTasks

router = APIRouter(prefix="/api/jackpots", tags=["Jackpots"])


@router.get("/bundle-info")
async def get_bundle_info(
    country: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    result = await db.execute(select(Jackpot).where(Jackpot.result == "pending"))
    pending_jackpots = result.scalars().all()
    
    region = await get_pricing_region(db, country or "US")
    currency = region.currency if region else "KES"
    currency_symbol = region.currency_symbol if region else "KES"
    
    total_price = 0
    locked_count = 0
    
    for jp in pending_jackpots:
        has_access = await user_has_jackpot_access(user, jp.id, db, jackpot_price=jp.price)
        if has_access:
            continue
            
        amount = jp.price
        if region and jp.regional_prices and region.region_code in jp.regional_prices:
            overrides = jp.regional_prices[region.region_code]
            amount = overrides.get("price", amount)
            
        total_price += amount
        locked_count += 1
        
    # Apply bundle discount from settings
    from app.routers.admin import get_referral_settings
    ref_settings = await get_referral_settings(db)
    bundle_discount_pct = float(ref_settings.get("jackpot_bundle_discount", 20))
    
    discounted_price = total_price * (1 - bundle_discount_pct / 100.0)
    
    # Check Referral Economy Discounts
    if user and user.referral_discount_active:
        disc_pct = float(ref_settings.get("discount_percentage", 50))
        referral_discount = discounted_price * (disc_pct / 100.0)
        discounted_price = max(0, discounted_price - referral_discount)
        
    return {
        "locked_count": locked_count,
        "original_price": total_price,
        "discounted_price": discounted_price,
        "discount_pct": bundle_discount_pct,
        "currency": currency,
        "currency_symbol": currency_symbol
    }


async def user_has_jackpot_access(user: Optional[User], jackpot_id: int, db: AsyncSession, jackpot_price: float = -1) -> bool:
    # Free jackpots are accessible to everyone (even guests)
    if jackpot_price == 0:
        return True
    if not user:
        return False
    # Admins and Premium subscribers get all jackpots
    if user.is_admin or (user.is_subscription_active and user.subscription_tier == "premium"):
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
    # Fetch retention setting
    retention_res = await db.execute(select(AdminSetting).where(AdminSetting.key == "jackpot_history_retention_days"))
    retention_setting = retention_res.scalar_one_or_none()
    retention_days = int(retention_setting.value) if retention_setting and retention_setting.value.isdigit() else 30

    query = select(Jackpot)

    # Only apply retention filter to non-admins
    if not user or not user.is_admin:
        cutoff_date = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=retention_days)
        query = query.where(Jackpot.created_at >= cutoff_date)

    result = await db.execute(query.order_by(Jackpot.created_at.desc()))
    jackpots = result.scalars().all()
    
    # Resolve pricing region
    region = await get_pricing_region(db, country or "US")

    response = []
    for jp in jackpots:
        jp_dict = jp.__dict__.copy()
        
        # Ensure variations is always a list
        if not jp_dict.get("variations"):
            jp_dict["variations"] = []
        
        # Determine override
        if region and jp.regional_prices and region.region_code in jp.regional_prices:
            overrides = jp.regional_prices[region.region_code]
            jp_dict["price"] = overrides.get("price", jp.price)
            
        jp_dict["currency"] = region.currency if region else "KES"
        jp_dict["currency_symbol"] = region.currency_symbol if region else "KES"

        has_access = await user_has_jackpot_access(user, jp.id, db, jackpot_price=jp.price)
        if has_access:
            response.append(JackpotResponse.model_validate(jp_dict))
        else:
            jp_dict["match_count"] = len(jp_dict.get("matches", []))
            jp_dict["variation_count"] = len(jp_dict.get("variations", []))
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
    
    if not jp_dict.get("variations"):
        jp_dict["variations"] = []
    
    region = await get_pricing_region(db, country or "US")
    if region and jp.regional_prices and region.region_code in jp.regional_prices:
        overrides = jp.regional_prices[region.region_code]
        jp_dict["price"] = overrides.get("price", jp.price)
        
    jp_dict["currency"] = region.currency if region else "KES"
    jp_dict["currency_symbol"] = region.currency_symbol if region else "KES"

    has_access = await user_has_jackpot_access(user, jp.id, db, jackpot_price=jp.price)
    if has_access:
        return JackpotResponse.model_validate(jp_dict)
    else:
        jp_dict["match_count"] = len(jp_dict.get("matches", []))
        jp_dict["variation_count"] = len(jp_dict.get("variations", []))
        jp_dict["locked"] = True
        return JackpotLockedResponse.model_validate(jp_dict)


@router.post("", response_model=JackpotResponse, status_code=201)
async def create_jackpot(body: JackpotCreate, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    jp = Jackpot(
        type=body.type,
        dc_level=body.dc_level,
        matches=[m.model_dump() for m in body.matches],
        variations=[list(v) for v in body.variations],
        price=body.price,
        regional_prices=body.regional_prices or {},
    )
    db.add(jp)
    await db.commit()
    await db.refresh(jp)
    
    if body.notify:
        from app.routers.admin import broadcast_push, BroadcastPushRequest
        # Catchy notification draft
        jp_name = "Mega Jackpot" if body.type.lower() == "mega" else "Midweek Jackpot"
        msg_title = f"🏆 {jp_name} Prediction is LIVE!"
        msg_body = f"Our expert {body.dc_level}DC analysis for the {jp_name} is now available. Log in, secure your variations, and let's win together!"
        
        req = BroadcastPushRequest(
            title=msg_title,
            body=msg_body,
            icon="/tambua-logo.jpg",
            url="/jackpots",
            target_tier=body.notify_target,
            target_country="all",
            delivery_method=body.notify_channel
        )
        try:
            await broadcast_push(req, background_tasks, db, admin)
        except Exception as e:
            print("Auto-broadcast failed:", e)

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
    if body.variations is not None:
        jp.variations = [list(v) for v in body.variations]

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
