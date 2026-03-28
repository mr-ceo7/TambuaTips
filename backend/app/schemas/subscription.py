"""
Pydantic schemas for subscription endpoints.
"""

from typing import Optional, List
from pydantic import BaseModel


class SubscriptionTierResponse(BaseModel):
    id: int
    tier_id: str
    name: str
    description: Optional[str] = None
    price_2wk: int
    price_4wk: int
    categories: List[str]
    popular: bool

    model_config = {"from_attributes": True}


class SubscribeRequest(BaseModel):
    tier_id: str  # basic, standard, premium
    duration_weeks: int  # 2 or 4
