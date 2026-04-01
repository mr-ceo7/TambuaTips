"""
News proxy route — fetches ESPN football news server-side.
"""

from fastapi import APIRouter, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.services.news_api import fetch_news
from app.dependencies import get_db
from app.models.ad import AdPost
from app.schemas.ad import AdPostResponse

router = APIRouter(prefix="/api/news", tags=["News"])

@router.get("")
async def get_news(page: int = Query(1, ge=1)):
    return await fetch_news(page)

@router.get("/ads", response_model=List[AdPostResponse])
async def get_active_ads(db: AsyncSession = Depends(get_db)):
    """Fetch all currently active ad posts for the frontend carousel."""
    result = await db.execute(
        select(AdPost)
        .where(AdPost.is_active == True)
        .order_by(AdPost.created_at.desc())
    )
    return result.scalars().all()
