"""
Pydantic schemas for the Affiliate Marketing system.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime


# ── Registration & Auth ──────────────────────────────────────

class AffiliateRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str = Field(..., min_length=10, max_length=20)


class AffiliateLogin(BaseModel):
    email: EmailStr
    password: str


# ── Responses ────────────────────────────────────────────────

class AffiliateResponse(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    referral_code: str
    status: str
    is_affiliate_admin: bool
    affiliate_admin_id: Optional[int] = None
    total_clicks: int = 0
    total_signups: int = 0
    total_revenue: float = 0.0
    commission_earned: float = 0.0
    commission_paid: float = 0.0
    commission_balance: float = 0.0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AffiliateDashboardStats(BaseModel):
    """Aggregate stats for the affiliate dashboard."""
    total_clicks: int = 0
    total_signups: int = 0
    total_purchases: int = 0
    total_revenue: float = 0.0
    commission_earned: float = 0.0
    commission_paid: float = 0.0
    commission_balance: float = 0.0
    # Monthly breakdown (current month)
    month_clicks: int = 0
    month_signups: int = 0
    month_purchases: int = 0
    month_commission: float = 0.0


class ConversionResponse(BaseModel):
    id: int
    conversion_type: str
    amount: float = 0.0
    commission_amount: float = 0.0
    affiliate_admin_commission: float = 0.0
    created_at: Optional[datetime] = None
    # Minimal user info (no sensitive data)
    user_name: Optional[str] = None

    model_config = {"from_attributes": True}


class PayoutResponse(BaseModel):
    id: int
    amount: float
    method: str
    phone: Optional[str] = None
    status: str
    transaction_id: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    """An affiliate under an affiliate admin."""
    id: int
    name: str
    email: str
    status: str
    total_clicks: int = 0
    total_signups: int = 0
    total_revenue: float = 0.0
    commission_earned: float = 0.0
    commission_paid: float = 0.0
    commission_balance: float = 0.0
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Admin Schemas ────────────────────────────────────────────

class CommissionConfigResponse(BaseModel):
    id: int
    item_type: str
    tier_id: Optional[str] = None
    duration: Optional[str] = None
    commission_percent: float = 10.0
    affiliate_admin_commission_percent: float = 20.0
    earn_on_renewal: bool = False

    model_config = {"from_attributes": True}


class CommissionConfigUpdate(BaseModel):
    item_type: str
    tier_id: Optional[str] = None
    duration: Optional[str] = None
    commission_percent: float = Field(ge=0, le=100)
    affiliate_admin_commission_percent: float = Field(ge=0, le=100)
    earn_on_renewal: bool = False


class AffiliateStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(approved|suspended|pending)$")


class AffiliateAdminAssign(BaseModel):
    affiliate_admin_id: Optional[int] = None  # null to unassign


class PayoutRequest(BaseModel):
    """Trigger payout for a single affiliate."""
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Tracking ─────────────────────────────────────────────────

class ClickTrackRequest(BaseModel):
    code: str
    referrer_url: Optional[str] = None
