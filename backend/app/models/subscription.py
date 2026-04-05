"""
Subscription tier configuration model — replaces frontend pricingService.ts localStorage.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Integer, Float, Boolean, DateTime, JSON

from app.database import Base


class SubscriptionTier(Base):
    __tablename__ = "subscription_tiers"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    tier_id = Column(String(20), unique=True, nullable=False)  # basic, standard, premium
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    price_2wk = Column(Float, nullable=False)  # KES
    price_4wk = Column(Float, nullable=False)  # KES
    regional_prices = Column(JSON, default=dict) # For dynamic overrides
    categories = Column(JSON, nullable=False)  # ["free", "4+", ...]
    popular = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
