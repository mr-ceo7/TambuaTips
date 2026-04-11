"""
User ORM model — extends the existing MySQL `users` table.
"""

from datetime import datetime, UTC
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified_at = Column(DateTime, nullable=True)
    password = Column(String(255), nullable=False)
    remember_token = Column(String(100), nullable=True)
    verification_code = Column(String(6), nullable=True)
    verification_code_expires_at = Column(DateTime, nullable=True)
    profile_picture = Column(String(500), nullable=True)
    phone = Column(String(20), unique=True, nullable=True, index=True)

    # New fields (will be added via Alembic migration)
    is_active = Column(Boolean, default=True, nullable=False, server_default="1")
    last_seen = Column(DateTime, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False, server_default="0")
    subscription_tier = Column(String(20), default="free", nullable=False, server_default="free")
    subscription_expires_at = Column(DateTime, nullable=True)
    favorite_teams = Column(JSON, default=list)
    
    country = Column(String(2), nullable=True) # ISO country code
    push_subscriptions = Column(JSON, default=list)

    # Anti-screenshot / One-device policies
    session_id = Column(String(100), nullable=True, unique=True, index=True)
    
    # Magic login token for SMS-migrated users (permanent, no expiry)
    magic_login_token = Column(String(32), unique=True, nullable=True, index=True)
    
    # Referral / Affiliate Marketing / Loyalty Economy
    referral_code = Column(String(20), unique=True, nullable=True, index=True)
    referrer_id = Column(BigInteger, ForeignKey('users.id'), nullable=True)
    referrals_count = Column(Integer, default=0, nullable=False, server_default="0")
    referral_points = Column(Integer, default=0, nullable=False, server_default="0")
    referral_discount_active = Column(Boolean, default=False, nullable=False, server_default="0")
    unlocked_tip_ids = Column(JSON, default=list)
    
    # Affiliate marketing — which affiliate drove this user's sign-up
    affiliate_id = Column(BigInteger, ForeignKey('affiliates.id'), nullable=True)
    
    # Self-referential relationship for referrals
    referred_users = relationship("User", backref="referrer", remote_side=[id])

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    payments = relationship("Payment", back_populates="user", lazy="selectin")
    jackpot_purchases = relationship("JackpotPurchase", back_populates="user", lazy="selectin")
    match_subscriptions = relationship("MatchSubscription", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan", lazy="selectin")

    @property
    def is_subscription_active(self) -> bool:
        if self.subscription_tier == "free" or self.subscription_expires_at is None:
            return False
            
        return self.subscription_expires_at > datetime.now(UTC).replace(tzinfo=None)


class UserSession(Base):
    """
    Model to track multiple sessions per user (for admin multi-device support).
    Admins can have up to 4 active sessions; regular users have only 1.
    """
    __tablename__ = "user_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey('users.id'), nullable=False, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    last_used_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)

    # Relationship back to User
    user = relationship("User", back_populates="sessions")
