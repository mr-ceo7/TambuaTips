"""
Sports API proxy routes — hides API-Football keys from frontend.
Server-side caching with TTL.
"""

import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException

from app.services.sports_api import (
    fetch_fixtures_by_date,
    fetch_fixture_by_id,
    fetch_standings,
    fetch_h2h,
    fetch_live_updates,
    fetch_fixtures_by_league,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sports", tags=["Sports"])


@router.get("/fixtures")
async def get_fixtures(
    date: Optional[str] = Query(None, description="YYYY-MM-DD"),
    league: Optional[int] = Query(None),
):
    try:
        if league:
            return await fetch_fixtures_by_league(league, date)
        return await fetch_fixtures_by_date(date)
    except Exception as e:
        logger.error(f"Sports fixtures error: {e}")
        detail = "All API keys exhausted for today" if "EXHAUSTED" in str(e) else "Failed to fetch fixtures"
        raise HTTPException(status_code=503, detail=detail)


@router.get("/fixtures/{fixture_id}")
async def get_fixture(fixture_id: int):
    try:
        result = await fetch_fixture_by_id(fixture_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Fixture not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sports fixture {fixture_id} error: {e}")
        raise HTTPException(status_code=503, detail="Failed to fetch fixture")


@router.get("/standings/{league_id}")
async def get_standings(league_id: int, season: Optional[int] = Query(None)):
    try:
        return await fetch_standings(league_id, season)
    except Exception as e:
        logger.error(f"Standings error for league {league_id}: {e}")
        raise HTTPException(status_code=503, detail="Failed to fetch standings")


@router.get("/h2h")
async def get_h2h(team1: int = Query(...), team2: int = Query(...)):
    try:
        return await fetch_h2h(team1, team2)
    except Exception as e:
        logger.error(f"H2H error for {team1} vs {team2}: {e}")
        raise HTTPException(status_code=503, detail="Failed to fetch head-to-head data")


@router.get("/live")
async def get_live(ids: str = Query(..., description="Comma-separated fixture IDs")):
    try:
        fixture_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
        return await fetch_live_updates(fixture_ids)
    except Exception as e:
        logger.error(f"Live updates error: {e}")
        raise HTTPException(status_code=503, detail="Failed to fetch live updates")
