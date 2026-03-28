"""
News proxy route — fetches ESPN football news server-side.
"""

from fastapi import APIRouter, Query
from app.services.news_api import fetch_news

router = APIRouter(prefix="/api/news", tags=["News"])


@router.get("")
async def get_news(page: int = Query(1, ge=1)):
    return await fetch_news(page)
