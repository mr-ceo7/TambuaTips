from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Text
from app.database import Base

class AdminSetting(Base):
    __tablename__ = "admin_settings"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    key = Column(String(50), unique=True, nullable=False, index=True)
    value = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

