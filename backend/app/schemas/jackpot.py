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


class JackpotCreate(BaseModel):
    type: str  # midweek, mega
    dc_level: int
    matches: List[JackpotMatch]
    price: int


class JackpotResponse(BaseModel):
    id: int
    type: str
    dc_level: int
    matches: List[JackpotMatch]
    price: int
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class JackpotLockedResponse(BaseModel):
    """Jackpot response with matches hidden."""
    id: int
    type: str
    dc_level: int
    match_count: int
    price: int
    locked: bool = True
    created_at: Optional[datetime] = None
