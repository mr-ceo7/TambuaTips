from pydantic import BaseModel, HttpUrl
from typing import Optional
from datetime import datetime

class AdPostBase(BaseModel):
    title: str
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    category: Optional[str] = "Promo"
    is_active: Optional[bool] = True

class AdPostCreate(AdPostBase):
    pass

class AdPostUpdate(AdPostBase):
    title: Optional[str] = None

class AdPostResponse(AdPostBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
