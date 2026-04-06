import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, Body
from pydantic import BaseModel
from app.config import settings
from app.services.alert_service import send_system_alert

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/internal", tags=["Internal"])

class AlertRequest(BaseModel):
    title: str
    message: str
    level: str = "ERROR"
    secret: str

@router.post("/system-alert")
async def trigger_system_alert(
    payload: AlertRequest = Body(...),
    x_internal_secret: Optional[str] = Header(None)
):
    """
    Private endpoint for the webhook monitor to trigger system-wide alerts.
    Protected by a shared secret set in the environment.
    """
    # Check secret from header or payload
    alert_secret = getattr(settings, "SYSTEM_ALERT_SECRET", "tambuatips-internal-guard-2026")
    
    if payload.secret != alert_secret and x_internal_secret != alert_secret:
        logger.warning(f"Unauthorized system-alert attempt from remote.")
        raise HTTPException(status_code=403, detail="Forbidden")

    # Trigger async alert task
    await send_system_alert(
        title=payload.title,
        message=payload.message,
        level=payload.level
    )
    
    return {"status": "dispatched"}


@router.get("/support-contact")
async def get_public_support_contact():
    """Public endpoint: Returns support contact details for the help widget. No auth required."""
    from app.database import async_session
    from sqlalchemy import select
    from app.models.setting import AdminSetting

    SUPPORT_DEFAULTS = {
        "SUPPORT_EMAIL": "tambuatips@gmail.com",
        "SUPPORT_WHATSAPP": "https://wa.me/254746957502",
        "SUPPORT_WHATSAPP_NUMBER": "+254 746 957 502",
    }

    async with async_session() as db:
        result = await db.execute(select(AdminSetting).where(AdminSetting.key.in_(SUPPORT_DEFAULTS.keys())))
        settings_db = {s.key: s.value for s in result.scalars().all()}

    out = {}
    for key, default in SUPPORT_DEFAULTS.items():
        out[key] = settings_db.get(key, default)
    return out
