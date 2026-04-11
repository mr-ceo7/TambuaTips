"""
Legacy M-Pesa transaction queue for payments still hitting the old platform.
"""

from datetime import datetime
from sqlalchemy import Column, BigInteger, String, Float, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.database import Base


class LegacyMpesaTransaction(Base):
    __tablename__ = "legacy_mpesa_transactions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_record_id = Column(BigInteger, nullable=False, index=True)
    biz_no = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=False, index=True)
    first_name = Column(String(255), nullable=True)
    other_name = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    paid_at = Column(DateTime, nullable=False, index=True)
    raw_payload = Column(Text, nullable=True)

    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True, index=True)
    payment_id = Column(BigInteger, ForeignKey("payments.id"), nullable=True, index=True)

    onboarding_status = Column(String(30), nullable=False, default="pending_assignment", server_default="pending_assignment")
    assigned_tier = Column(String(50), nullable=True)
    assigned_duration_days = Column(BigInteger, nullable=True)
    assigned_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")
    payment = relationship("Payment")

    __table_args__ = (
        UniqueConstraint("source_record_id", name="uq_legacy_mpesa_transactions_source_record_id"),
        Index("ix_legacy_mpesa_status_paid_at", "onboarding_status", "paid_at"),
    )
