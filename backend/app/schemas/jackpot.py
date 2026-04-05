"""
Pydantic schemas for jackpot endpoints.
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class JackpotMatch(BaseModel):
    homeTeam: str
    awayTeam: str
    pick: str
    result: Optional[str] = None  # won, lost, void — per-match result


class JackpotCreate(BaseModel):
    type: str  # midweek, mega
    dc_level: int
    matches: List[JackpotMatch]
    price: float
    regional_prices: Optional[dict] = {}


class JackpotUpdate(BaseModel):
    type: Optional[str] = None
    dc_level: Optional[int] = None
    matches: Optional[List[JackpotMatch]] = None
    price: Optional[float] = None
    result: Optional[str] = None  # pending, won, lost, void, bonus
    regional_prices: Optional[dict] = None


class JackpotResponse(BaseModel):
    id: int
    type: str
    dc_level: int
    matches: List[JackpotMatch]
    price: float
    result: Optional[str] = "pending"
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JackpotLockedResponse(BaseModel):
    """Jackpot response with matches hidden."""
    id: int
    type: str
    dc_level: int
    match_count: int
    price: float
    result: Optional[str] = "pending"
    locked: bool = True
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"
    created_at: Optional[datetime] = None
