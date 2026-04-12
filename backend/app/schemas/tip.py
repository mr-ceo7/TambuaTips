"""
Pydantic schemas for tips endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class BookmakerOdd(BaseModel):
    bookmaker: str
    odds: str


class TipCreate(BaseModel):
    fixture_id: int
    home_team: str
    away_team: str
    league: str
    match_date: datetime
    prediction: str
    odds: str
    bookmaker: str
    bookmaker_odds: Optional[List[BookmakerOdd]] = None
    confidence: int = 3
    reasoning: Optional[str] = None
    category: str = "2+"
    is_free: bool = False
    notify: bool = False
    notify_target: str = "all"  # all, subscribers, free, basic, standard, premium
    notify_channel: str = "both"  # both, push, email, sms


class TipUpdate(BaseModel):
    prediction: Optional[str] = None
    odds: Optional[str] = None
    confidence: Optional[int] = None
    reasoning: Optional[str] = None
    category: Optional[str] = None
    is_free: Optional[bool] = None
    result: Optional[str] = None


class TipResponse(BaseModel):
    id: int
    fixture_id: int
    home_team: str
    away_team: str
    league: str
    match_date: datetime
    prediction: str
    odds: str
    bookmaker: str
    bookmaker_odds: Optional[List[BookmakerOdd]] = None
    confidence: int
    reasoning: Optional[str] = None
    category: str
    is_premium: int
    result: str
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TipLockedResponse(BaseModel):
    """Tip response with prediction hidden for non-subscribers."""
    id: int
    fixture_id: int
    home_team: str
    away_team: str
    league: str
    match_date: datetime
    prediction: str = "🔒 Locked"
    odds: str = "🔒"
    bookmaker: str = ""
    bookmaker_odds: Optional[List[BookmakerOdd]] = None
    confidence: int = 0
    reasoning: Optional[str] = None
    category: str
    is_premium: int
    result: str
    locked: bool = True
    created_at: Optional[datetime] = None


class TipStatsResponse(BaseModel):
    total: int
    won: int
    lost: int
    pending: int
    voided: int
    postponed: int
    win_rate: float
