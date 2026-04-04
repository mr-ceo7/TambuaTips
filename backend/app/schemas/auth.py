"""
Pydantic schemas for authentication endpoints.
"""

from datetime import datetime
from typing import Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field


# ── Requests ─────────────────────────────────────────────────

class GoogleLoginRequest(BaseModel):
    id_token: str
    referred_by_code: Optional[str] = None

class PhoneLoginRequest(BaseModel):
    phone: str
    referred_by_code: Optional[str] = None

class PhoneVerifyRequest(BaseModel):
    phone: str
    code: str
    referred_by_code: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str

class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict

class ActivityRequest(BaseModel):
    path: str
    time_spent: int
    session_id: Optional[str] = None

class UpdateFavoritesRequest(BaseModel):
    favorite_teams: list[str] = Field(default_factory=list)


# ── Responses ────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    is_admin: bool
    is_active: bool
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    is_subscription_active: bool
    favorite_teams: list[str] = Field(default_factory=list)
    country: Optional[str] = None
    created_at: Optional[datetime] = None
    profile_picture: Optional[str] = None
    referral_code: Optional[str] = None
    referrals_count: int = 0
    phone: Optional[str] = None

    model_config = {"from_attributes": True}

class AdminUserResponse(UserResponse):
    last_seen: Optional[datetime] = None
    most_visited_page: Optional[str] = None
    total_time_spent: int = 0
    is_online: bool = False
