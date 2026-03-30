"""
Pydantic schemas for authentication endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ── Requests ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str

class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict

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
    subscription_tier: str
    subscription_expires_at: Optional[datetime] = None
    is_subscription_active: bool
    favorite_teams: list[str] = Field(default_factory=list)
    country: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
