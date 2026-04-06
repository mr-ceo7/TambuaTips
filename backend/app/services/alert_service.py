import logging
import httpx
from datetime import datetime
from sqlalchemy import select
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.user import User
from app.services.email_service import _send_smtp_email, _generate_html_template

logger = logging.getLogger(__name__)

async def get_admin_contacts(db):
    """Fetch all admin emails and phone numbers."""
    result = await db.execute(select(User).where(User.is_admin == True))
    admins = result.scalars().all()
    # Also include the emergency phones
    emergency_phones = [
        getattr(settings, "EMERGENCY_PHONE", "+254746957502"),
        "+254726412213"
    ]
    
    emails = [a.email for a in admins if a.email]
    phones = [a.phone for a in admins if a.phone]
    for e_phone in emergency_phones:
        if e_phone and e_phone not in phones:
            phones.append(e_phone)
            
    return emails, phones

async def send_system_alert(title: str, message: str, level: str = "ERROR"):
    """
    Sends a high-priority system alert to all admins via Email and SMS.
    level: INFO, WARNING, ERROR, CRITICAL
    """
    async with AsyncSessionLocal() as db:
        emails, phones = await get_admin_contacts(db)
        
    # 1. Send Email
    subject = f"🚨 TambuaTips System Alert [{level}]: {title}"
    body = f"""
    <div style="background-color: #7f1d1d; color: #fecaca; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <strong>SYSTEM ALERT</strong><br>
        Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br>
        Priority: {level}
    </div>
    <div style="color: #ffffff; font-family: monospace; background: #000; padding: 15px; border-radius: 4px; border: 1px solid #333;">
        {message.replace('\n', '<br>')}
    </div>
    """
    html_content = _generate_html_template(title, body, "View Console", "https://tambuatips.com/_deploy")
    
    for email in emails:
        try:
            await _send_smtp_email(email, subject, html_content)
        except Exception as e:
            logger.error(f"Failed to send alert email to {email}: {e}")

    # 2. Send SMS
    if "AI" in title:
        sms_message = f"TAMBUATIPS {level}: {title}. {message}"
    else:
        sms_message = f"TAMBUATIPS {level}: {title}. Details: {message[:100]}..."
    
    # SMS settings retrieval (similar to auth.py)
    from app.routers.admin import get_sms_settings
    async with AsyncSessionLocal() as db:
        sms_config = await get_sms_settings(db)
        
    if not sms_config.get("SMS_ENABLED", True):
        logger.info("SMS alerts disabled by admin settings")
        return

    # Call custom SMS provider (Trackomgroup)
    sms_url = "https://trackomgroup.com/sms_old/sendSmsApi/sendsms_v15.php"
    sms_src = sms_config.get("SMS_SRC", "ARVOCAP")
    
    async with httpx.AsyncClient() as client:
        for phone in phones:
            # Strip everything except digits (remove + and spaces) to match auth.py provider format
            import re
            stripped_phone = re.sub(r'[\D]', '', phone)
            params = {
                "src": sms_src,
                "phone_number": stripped_phone,
                "sms_message": sms_message
            }
            try:
                # Use POST with params to match auth.py exactly
                resp = await client.post(sms_url, params=params)
                logger.info(f"System Alert SMS sent to {phone}. Status: {resp.status_code}")
            except Exception as e:
                logger.error(f"Failed to send alert SMS to {phone}: {e}")
