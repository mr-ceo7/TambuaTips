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
    price_2wk: float
    price_4wk: float
    categories: List[str]
    popular: bool
    regional_prices: Optional[dict] = {}
    currency: Optional[str] = "KES"
    currency_symbol: Optional[str] = "KES"

    model_config = {"from_attributes": True}


class SubscribeRequest(BaseModel):
    tier_id: str  # basic, standard, premium
    duration_weeks: int  # 2 or 4


class SubscriptionTierUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price_2wk: Optional[int] = None
    price_4wk: Optional[int] = None
    categories: Optional[List[str]] = None
    popular: Optional[bool] = None
    regional_prices: Optional[dict] = None


class SubscriptionTierCreate(BaseModel):
    tier_id: str  # e.g. "gold"
    name: str
    description: Optional[str] = None
    price_2wk: float
    price_4wk: float
    categories: List[str]
    popular: bool = False
    regional_prices: Optional[dict] = {}
