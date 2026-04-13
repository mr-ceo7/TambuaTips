"""
Pydantic schemas for jackpot endpoints.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, model_validator


class JackpotMatch(BaseModel):
    homeTeam: str
    awayTeam: str
    result: Optional[str] = None  # won, lost, void — per-match result
    country: Optional[str] = None
    countryFlag: Optional[str] = None


class JackpotCreate(BaseModel):
    type: str  # midweek, mega
    dc_level: int
    matches: List[JackpotMatch]
    variations: List[List[str]]  # Each inner list is a row of picks
    price: float
    display_date: Optional[date] = None
    regional_prices: Optional[dict] = {}
    notify: bool = False
    notify_target: str = "all"
    notify_channel: str = "both"

    @model_validator(mode="after")
    def validate_variations(self):
        match_count = len(self.matches)
        for i, var in enumerate(self.variations):
            if len(var) != match_count:
                raise ValueError(
                    f"Variation {i+1} has {len(var)} picks but there are {match_count} matches"
                )
        return self


class JackpotUpdate(BaseModel):
    type: Optional[str] = None
    dc_level: Optional[int] = None
    matches: Optional[List[JackpotMatch]] = None
    variations: Optional[List[List[str]]] = None
    price: Optional[float] = None
    result: Optional[str] = None  # pending, won, lost, void, bonus
    display_date: Optional[date] = None
    regional_prices: Optional[dict] = None


class JackpotResponse(BaseModel):
    id: int
    type: str
    dc_level: int
    matches: List[JackpotMatch]
    variations: List[List[str]]
    price: float
    result: Optional[str] = "pending"
    display_date: Optional[date] = None
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JackpotLockedResponse(BaseModel):
    """Jackpot response with matches and variations hidden."""
    id: int
    type: str
    dc_level: int
    match_count: int
    variation_count: int
    price: float
    result: Optional[str] = "pending"
    locked: bool = True
    display_date: Optional[date] = None
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"
    created_at: Optional[datetime] = None
