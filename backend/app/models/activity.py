"""
User Activity Tracking ORM Model
"""

from datetime import datetime
from sqlalchemy import Column, Integer, BigInteger, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class UserActivity(Base):
    __tablename__ = "user_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(255), nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="activities")


class AnonymousVisitor(Base):
    __tablename__ = "anonymous_visitors"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(String(255), unique=True, index=True, nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)

    # Relationships
    activities = relationship("AnonymousActivity", back_populates="visitor", cascade="all, delete-orphan")


class AnonymousActivity(Base):
    __tablename__ = "anonymous_activities"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    visitor_id = Column(Integer, ForeignKey("anonymous_visitors.id", ondelete="CASCADE"), nullable=False, index=True)
    path = Column(String(255), nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    visitor = relationship("AnonymousVisitor", back_populates="activities")
