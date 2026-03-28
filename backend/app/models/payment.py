"""
Payment transaction model — logs all payment attempts.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Integer, nullable=False)  # KES
    currency = Column(String(10), default="KES", nullable=False)
    method = Column(String(20), nullable=False)  # mpesa, paypal, skrill, card
    status = Column(String(20), nullable=False, default="pending")  # pending, completed, failed, refunded
    reference = Column(String(255), nullable=True)  # External payment reference
    transaction_id = Column(String(255), nullable=True)  # Gateway transaction ID

    # What was purchased
    item_type = Column(String(50), nullable=False)  # subscription, jackpot
    item_id = Column(String(100), nullable=True)  # tier_id or jackpot_id

    # Metadata
    phone = Column(String(20), nullable=True)  # For M-Pesa
    email = Column(String(255), nullable=True)  # For PayPal/Skrill
    gateway_response = Column(Text, nullable=True)  # Raw gateway response for debugging

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="payments")
