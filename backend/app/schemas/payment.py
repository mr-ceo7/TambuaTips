"""
Pydantic schemas for payment endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PaymentRequest(BaseModel):
    item_type: str  # subscription, jackpot
    item_id: str  # tier_id or jackpot_id
    duration_weeks: Optional[int] = None  # 2 or 4 for subscriptions


class MpesaPaymentRequest(PaymentRequest):
    phone: str


class PaymentResponse(BaseModel):
    id: int
    amount: int
    currency: str
    method: str
    status: str
    reference: Optional[str] = None
    item_type: str
    item_id: Optional[str] = None
    created_at: Optional[datetime] = None
    auth_url: Optional[str] = None
    access_code: Optional[str] = None

    model_config = {"from_attributes": True}


class MpesaCallbackData(BaseModel):
    """Schema for M-Pesa STK Push callback."""
    Body: dict
