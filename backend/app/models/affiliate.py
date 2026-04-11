"""
Affiliate Marketing models — separate from regular Users.
Affiliates are digital marketers who earn commission by driving traffic and sales.
"""

from datetime import datetime, UTC
from sqlalchemy import (
    Column, BigInteger, Integer, String, Float, Boolean,
    DateTime, Text, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.database import Base


class Affiliate(Base):
    """
    An affiliate marketer account — completely separate from the User table.
    Regular users can also sign up as affiliates with a different email/password.
    """
    __tablename__ = "affiliates"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)  # Required for M-Pesa B2C payout

    # Unique referral code for tracking (e.g. "AFF-JOHN5X")
    referral_code = Column(String(30), unique=True, nullable=False, index=True)

    # Status: "pending" (needs admin approval), "approved", "suspended"
    status = Column(String(20), default="pending", nullable=False, server_default="pending")

    # OTP for Phone Login
    otp_code = Column(String(10), nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    # Affiliate Admin hierarchy
    affiliate_admin_id = Column(BigInteger, ForeignKey("affiliates.id"), nullable=True)
    is_affiliate_admin = Column(Boolean, default=False, nullable=False, server_default="0")

    # Cached counters for fast dashboard reads
    total_clicks = Column(Integer, default=0, nullable=False, server_default="0")
    total_signups = Column(Integer, default=0, nullable=False, server_default="0")
    total_revenue = Column(Float, default=0.0, nullable=False, server_default="0")

    # Commission tracking
    commission_earned = Column(Float, default=0.0, nullable=False, server_default="0")
    commission_paid = Column(Float, default=0.0, nullable=False, server_default="0")

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    # Relationships
    team_members = relationship(
        "Affiliate",
        backref="admin",
        remote_side=[id],
        foreign_keys=[affiliate_admin_id],
    )
    clicks = relationship("AffiliateClick", back_populates="affiliate", cascade="all, delete-orphan")
    conversions = relationship("AffiliateConversion", back_populates="affiliate", cascade="all, delete-orphan")
    payouts = relationship("AffiliatePayout", back_populates="affiliate", cascade="all, delete-orphan")

    @property
    def commission_balance(self) -> float:
        """Unpaid commission: earned minus paid."""
        return round((self.commission_earned or 0.0) - (self.commission_paid or 0.0), 2)


class AffiliateClick(Base):
    """Every time someone clicks an affiliate's tracking link."""
    __tablename__ = "affiliate_clicks"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    affiliate_id = Column(BigInteger, ForeignKey("affiliates.id"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    referrer_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    affiliate = relationship("Affiliate", back_populates="clicks")


class AffiliateConversion(Base):
    """
    When a tracked visitor signs up (type='signup') or makes a purchase (type='purchase').
    Links back to the affiliate who drove the traffic.
    """
    __tablename__ = "affiliate_conversions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    affiliate_id = Column(BigInteger, ForeignKey("affiliates.id"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)

    # "signup" or "purchase"
    conversion_type = Column(String(20), nullable=False)

    # Links to the actual payment (for purchase conversions)
    payment_id = Column(BigInteger, ForeignKey("payments.id"), nullable=True)

    # Financial details
    amount = Column(Float, default=0.0, nullable=False)  # The purchase amount (0 for signups)
    commission_amount = Column(Float, default=0.0, nullable=False)  # Affiliate's commission
    affiliate_admin_commission = Column(Float, default=0.0, nullable=False)  # Admin's cut of affiliate's commission

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    affiliate = relationship("Affiliate", back_populates="conversions")
    user = relationship("User", foreign_keys=[user_id])
    payment = relationship("Payment", foreign_keys=[payment_id])

    __table_args__ = (
        # Prevent duplicate purchase commissions for the same payment
        Index("ix_aff_conv_payment_unique", "affiliate_id", "payment_id", unique=True,
              postgresql_where=Column("payment_id").isnot(None)),
    )


class AffiliatePayout(Base):
    """Record of each payout to an affiliate or affiliate admin."""
    __tablename__ = "affiliate_payouts"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    affiliate_id = Column(BigInteger, ForeignKey("affiliates.id"), nullable=False, index=True)

    amount = Column(Float, nullable=False)
    method = Column(String(20), default="mpesa_b2c", nullable=False)  # mpesa_b2c, manual
    phone = Column(String(20), nullable=True)  # The M-Pesa number paid to

    # "pending", "completed", "failed"
    status = Column(String(20), default="pending", nullable=False)
    transaction_id = Column(String(255), nullable=True)  # From M-Pesa B2C response

    # The period this payout covers
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))

    affiliate = relationship("Affiliate", back_populates="payouts")


class AffiliateCommissionConfig(Base):
    """
    Per-package commission rates set by the admin.
    Covers both subscription tiers and jackpot purchases.
    """
    __tablename__ = "affiliate_commission_configs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # What this config applies to
    item_type = Column(String(20), nullable=False)  # "subscription" or "jackpot"
    tier_id = Column(String(30), nullable=True)  # e.g. "basic", "standard", "premium" (null for jackpot)
    duration = Column(String(10), nullable=True)  # "2wk" or "4wk" (null for jackpot)

    # Commission percentages
    commission_percent = Column(Float, default=10.0, nullable=False)  # % of sale price → affiliate
    affiliate_admin_commission_percent = Column(Float, default=20.0, nullable=False)  # % of AFFILIATE's commission → admin

    # Renewal policy
    earn_on_renewal = Column(Boolean, default=False, nullable=False, server_default="0")

    created_at = Column(DateTime, default=lambda: datetime.now(UTC))
    updated_at = Column(DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    __table_args__ = (
        # Each combination of item_type + tier_id + duration should be unique
        Index("ix_aff_comm_unique", "item_type", "tier_id", "duration", unique=True),
    )
