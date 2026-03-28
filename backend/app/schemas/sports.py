"""
Pydantic schemas for sports/news proxy endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel


class FixtureResponse(BaseModel):
    id: int
    sport: str
    league: str
    leagueId: int
    leagueLogo: Optional[str] = None
    homeTeam: str
    awayTeam: str
    homeLogo: Optional[str] = None
    awayLogo: Optional[str] = None
    matchDate: str
    status: str  # upcoming, live, finished
    score: Optional[str] = None
    elapsed: Optional[int] = None
    venue: Optional[str] = None


class StandingResponse(BaseModel):
    """Passthrough — raw standings from API-Football."""
    pass


class NewsItemResponse(BaseModel):
    id: str
    title: str
    source: str
    time: str
    image: str
    category: str
    link: str
