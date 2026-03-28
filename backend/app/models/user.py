"""
User ORM model — extends the existing MySQL `users` table.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Boolean, Text
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    email_verified_at = Column(DateTime, nullable=True)
    password = Column(String(255), nullable=False)
    remember_token = Column(String(100), nullable=True)

    # New fields (will be added via Alembic migration)
    is_admin = Column(Boolean, default=False, nullable=False, server_default="0")
    subscription_tier = Column(String(20), default="free", nullable=False, server_default="free")
    subscription_expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payments = relationship("Payment", back_populates="user", lazy="selectin")
    jackpot_purchases = relationship("JackpotPurchase", back_populates="user", lazy="selectin")

    @property
    def is_subscription_active(self) -> bool:
        if self.subscription_tier == "free":
            return False
        if self.subscription_expires_at is None:
            return False
        return self.subscription_expires_at > datetime.utcnow()
