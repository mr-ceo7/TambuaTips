"""
Pricing configuration model for Geo-Fair dynamic pricing.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime

from app.database import Base


class PricingRegion(Base):
    __tablename__ = "pricing_regions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    region_code = Column(String(50), unique=True, nullable=False, index=True) # e.g. "local", "international"
    name = Column(String(100), nullable=False) # e.g. "East Africa", "Rest of World"
    currency = Column(String(10), nullable=False) # e.g. "KES", "USD"
    currency_symbol = Column(String(10), nullable=False) # e.g. "KES", "$"
    countries = Column(JSON, nullable=False, default=list) # e.g. ["KE", "UG", "TZ"] or ["*"] for fallback
    is_default = Column(Boolean, default=False, nullable=False) # Use as fallback if IP doesn't match

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

