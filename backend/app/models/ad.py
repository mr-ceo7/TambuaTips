from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime

from app.database import Base

class AdPost(Base):
    __tablename__ = "ad_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    image_url = Column(String(500), nullable=True)
    link_url = Column(String(500), nullable=True)
    category = Column(String(50), default="Promo")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
