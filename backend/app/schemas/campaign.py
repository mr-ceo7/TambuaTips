from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class CampaignBase(BaseModel):
    slug: str
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: datetime
    incentive_type: str
    incentive_value: float
    asset_video_url: Optional[str] = None
    asset_image_url: Optional[str] = None
    og_image_url: Optional[str] = None
    banner_text: Optional[str] = None
    
    theme_color_hex: Optional[str] = None
    use_splash_screen: bool = False
    use_floating_badge: bool = False
    use_particle_effects: bool = False
    use_custom_icons: bool = False
    
    is_active: bool = True

class CampaignCreate(CampaignBase):
    pass

class CampaignUpdate(BaseModel):
    slug: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    incentive_type: Optional[str] = None
    incentive_value: Optional[float] = None
    asset_video_url: Optional[str] = None
    asset_image_url: Optional[str] = None
    og_image_url: Optional[str] = None
    banner_text: Optional[str] = None
    
    theme_color_hex: Optional[str] = None
    use_splash_screen: Optional[bool] = None
    use_floating_badge: Optional[bool] = None
    use_particle_effects: Optional[bool] = None
    use_custom_icons: Optional[bool] = None
    
    is_active: Optional[bool] = None

class CampaignResponse(CampaignBase):
    id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
