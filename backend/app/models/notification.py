from sqlalchemy import Column, Integer, BigInteger, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base

class MatchSubscription(Base):
    __tablename__ = "match_subscriptions"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    match_id = Column(Integer, index=True, nullable=False)
    home_team = Column(String(100), nullable=True)
    away_team = Column(String(100), nullable=True)
    
    # Track the last lifecycle state we successfully pushed for this specific match
    # Usually: 'upcoming' -> 'live' -> 'finished'
    last_status_notified = Column(String(50), default="upcoming", nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="match_subscriptions")
