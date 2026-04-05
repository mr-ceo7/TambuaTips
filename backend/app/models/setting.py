from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from app.database import Base

class AdminSetting(Base):
    __tablename__ = "admin_settings"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    key = Column(String(50), unique=True, nullable=False, index=True)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
