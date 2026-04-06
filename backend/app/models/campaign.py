from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, BigInteger

from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    
    incentive_type = Column(String(50), nullable=False) # e.g. "extra_days", "discount"
    incentive_value = Column(Float, nullable=False)
    
    asset_video_url = Column(String(500), nullable=True)
    asset_image_url = Column(String(500), nullable=True)
    og_image_url = Column(String(500), nullable=True)
    banner_text = Column(String(255), nullable=True)
    
    theme_color_hex = Column(String(7), nullable=True)
    use_splash_screen = Column(Boolean, default=False)
    use_floating_badge = Column(Boolean, default=False)
    use_particle_effects = Column(Boolean, default=False)
    use_custom_icons = Column(Boolean, default=False)
    
    # ─── Tracking & Analytics ───
    click_count = Column(Integer, default=0)
    login_count = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    revenue_generated = Column(Float, default=0.0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
