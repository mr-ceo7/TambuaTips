"""
Jackpot ORM model and JackpotPurchase model — replaces frontend localStorage jackpots.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Integer, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Jackpot(Base):
    __tablename__ = "jackpots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    type = Column(String(20), nullable=False)  # midweek, mega
    dc_level = Column(Integer, nullable=False)  # 3, 4, 5, 6, 7, 10
    matches = Column(JSON, nullable=False)  # [{homeTeam, awayTeam, pick}]
    price = Column(Float, nullable=False)  # KES
    regional_prices = Column(JSON, default=dict) # For dynamic overrides

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    purchases = relationship("JackpotPurchase", back_populates="jackpot", lazy="selectin")


class JackpotPurchase(Base):
    __tablename__ = "jackpot_purchases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    jackpot_id = Column(BigInteger, ForeignKey("jackpots.id"), nullable=False, index=True)
    payment_id = Column(BigInteger, ForeignKey("payments.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="jackpot_purchases")
    jackpot = relationship("Jackpot", back_populates="purchases")
