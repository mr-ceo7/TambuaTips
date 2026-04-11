"""
Tip ORM model — replaces frontend localStorage tips.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, Integer, String, DateTime, Text, JSON

from app.database import Base


class Tip(Base):
    __tablename__ = "tips"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    fixture_id = Column(BigInteger, nullable=False, index=True)
    home_team = Column(String(255), nullable=False)
    away_team = Column(String(255), nullable=False)
    league = Column(String(255), nullable=False)
    match_date = Column(DateTime, nullable=False)
    prediction = Column(String(255), nullable=False)
    odds = Column(String(50), nullable=False)
    bookmaker = Column(String(100), nullable=False)
    bookmaker_odds = Column(JSON, nullable=True)  # [{bookmaker: str, odds: str}]
    confidence = Column(Integer, nullable=False, default=3)
    reasoning = Column(Text, nullable=True)
    category = Column(String(20), nullable=False, default="free")  # free, 2+, 4+, gg, 10+, vip
    is_premium = Column(Integer, nullable=False, default=0)  # 0=free, 1=premium
    result = Column(String(20), nullable=False, default="pending")  # pending, won, lost, void

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
