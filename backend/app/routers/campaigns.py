from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import shutil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from datetime import datetime, UTC

from app.dependencies import get_db, require_admin
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.campaign import CampaignResponse, CampaignCreate, CampaignUpdate

router = APIRouter(prefix="/api/campaigns", tags=["Campaigns"])

@router.get("/active", response_model=CampaignResponse)
async def get_active_campaign(db: AsyncSession = Depends(get_db)):
    """Get the currently active campaign based on date and is_active flag."""
    now = datetime.now(UTC).replace(tzinfo=None)
    
    # Overlapping campaigns: default to the one that started most recently
    result = await db.execute(
        select(Campaign)
        .where(
            Campaign.is_active == True,
            Campaign.start_date <= now,
            Campaign.end_date >= now
        )
        .order_by(Campaign.start_date.desc())
        .limit(1)
    )
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="No active campaign")
        
    return campaign

@router.post("/{slug}/click")
async def track_campaign_click(slug: str, db: AsyncSession = Depends(get_db)):
    """Public: Increment click count for a specific campaign."""
    result = await db.execute(select(Campaign).where(Campaign.slug == slug))
    campaign = result.scalar_one_or_none()
    
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    campaign.click_count += 1
    await db.commit()
    return {"status": "success"}

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """Admin: List all campaigns."""
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return result.scalars().all()

@router.post("", response_model=CampaignResponse)
async def create_campaign(
    campaign_in: CampaignCreate, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    # Check if slug exists
    result = await db.execute(select(Campaign).where(Campaign.slug == campaign_in.slug))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Campaign slug already exists")
        
    db_campaign = Campaign(**campaign_in.model_dump())
    db.add(db_campaign)
    
    try:
        await db.commit()
        await db.refresh(db_campaign)
        return db_campaign
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int, 
    campaign_in: CampaignUpdate, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    db_campaign = result.scalar_one_or_none()
    
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    if campaign_in.slug and campaign_in.slug != db_campaign.slug:
        slug_check = await db.execute(select(Campaign).where(Campaign.slug == campaign_in.slug))
        if slug_check.scalar_one_or_none():
             raise HTTPException(status_code=400, detail="Campaign slug already exists")

    update_data = campaign_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_campaign, key, value)
        
    await db.commit()
    await db.refresh(db_campaign)
    return db_campaign

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: int, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    db_campaign = result.scalar_one_or_none()
    
    if not db_campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
        
    await db.delete(db_campaign)
    await db.commit()
    return {"status": "success", "message": f"Campaign {campaign_id} deleted"}

@router.post("/upload")
async def upload_campaign_asset(
    file: UploadFile = File(...),
    admin: User = Depends(require_admin)
):
    """Upload an image or video directly to the server."""
    os.makedirs("media/uploads", exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    import uuid
    safe_name = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join("media/uploads", safe_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"url": f"/media/uploads/{safe_name}"}

from app.database import AsyncSessionLocal

async def track_campaign_event(event_type: str, revenue: float = 0.0):
    """Internal helper to attribute an event to the currently active campaign."""
    now = datetime.now(UTC).replace(tzinfo=None)
    
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(Campaign)
                .where(
                    Campaign.is_active == True,
                    Campaign.start_date <= now,
                    Campaign.end_date >= now
                )
                .order_by(Campaign.start_date.desc())
                .limit(1)
            )
            campaign = result.scalar_one_or_none()
            
            if campaign:
                if event_type == "login":
                    campaign.login_count += 1
                elif event_type == "purchase":
                    campaign.purchase_count += 1
                    campaign.revenue_generated += revenue
                
                session.add(campaign)
                await session.commit()
    except Exception as e:
        import logging
        logging.error(f"Error tracking campaign event: {e}")
