"""
Queue model for admin-managed automatic SMS tip delivery.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.database import Base


class SmsTipQueue(Base):
    __tablename__ = "sms_tip_queue"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False, index=True)
    tip_id = Column(BigInteger, ForeignKey("tips.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending", server_default="pending")
    dispatch_scheduled_for = Column(DateTime, nullable=False, index=True)
    sent_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    tip = relationship("Tip")

    __table_args__ = (
        UniqueConstraint("user_id", "tip_id", name="uq_sms_tip_queue_user_tip"),
        Index("ix_sms_tip_queue_user_status_dispatch", "user_id", "status", "dispatch_scheduled_for"),
    )
