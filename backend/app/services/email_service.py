import logging
from email.message import EmailMessage
try:
    import aiosmtplib
except ModuleNotFoundError:  # pragma: no cover - optional in test/dev environments
    aiosmtplib = None
from app.config import settings
from app.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

def _generate_html_template(title: str, body: str, cta_text: str = None, cta_url: str = None) -> str:
    """Generates a professional, branded HTML email template for TambuaTips."""
    cta_html = ""
    if cta_text and cta_url:
        cta_html = f"""
        <div style="text-align: center; margin-top: 30px;">
            <a href="{cta_url}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">{cta_text}</a>
        </div>
        """
        
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #061f10; font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #e4e4e7; line-height: 1.6;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #061f10; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #0d2a17; border: 1px solid #144023; border-radius: 16px; max-width: 600px; width: 100%; margin: 0 auto; overflow: hidden;">
                        
                        <!-- Header -->
                        <tr>
                            <td style="padding: 30px 40px; border-bottom: 1px solid #144023; text-align: center; background-color: #0a2413;">
                                <h1 style="color: #10b981; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px;">TAMBUATIPS</h1>
                                <p style="color: #a1a1aa; margin: 5px 0 0 0; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Premium Sports Intelligence</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="color: #ffffff; margin-top: 0; font-size: 22px; font-weight: 700;">{title}</h2>
                                <div style="color: #d4d4d8; font-size: 16px; margin-bottom: 20px;">
                                    {body}
                                </div>
                                {cta_html}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px; background-color: #0a2413; text-align: center; border-top: 1px solid #144023;">
                                <p style="color: #71717a; font-size: 13px; margin: 0 0 10px 0;">
                                    © {settings.SMTP_SERVER.split('.')[0] if hasattr(settings, 'SMTP_SERVER') else '2026'} TambuaTips. All rights reserved.
                                </p>
                                <p style="color: #71717a; font-size: 13px; margin: 0;">
                                    <a href="https://tambuatips.com" style="color: #10b981; text-decoration: none;">Visit tambuatips.com</a> | 
                                    <a href="https://tambuatips.com/privacy" style="color: #71717a; text-decoration: underline;">Privacy Policy</a>
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

async def _send_smtp_email(to_email: str, subject: str, html_content: str):
    """Core function to dispatch emails via aiosmtplib."""
    if aiosmtplib is None:
        logger.warning(f"aiosmtplib is not installed. Skipping email to {to_email}")
        return
    
    # Grab settings from DB
    from app.routers.admin import get_email_settings
    async with AsyncSessionLocal() as db:
        email_settings = await get_email_settings(db)
        
    smtp_email = email_settings.get("SMTP_EMAIL") or settings.SMTP_USERNAME
    smtp_pass = email_settings.get("SMTP_PASSWORD") or settings.SMTP_PASSWORD
    from_email = smtp_email or settings.FROM_EMAIL
    
    if not smtp_pass:
        logger.warning(f"SMTP_PASSWORD not set in env or admin settings. Simulating email to {to_email}")
        logger.info(f"Subject: {subject}")
        return

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(html_content, subtype="html")

    try:
        use_tls = True if settings.SMTP_PORT == 465 else False
        start_tls = True if settings.SMTP_PORT == 587 else False

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_SERVER,
            port=settings.SMTP_PORT,
            username=smtp_email,
            password=smtp_pass,
            use_tls=use_tls,
            start_tls=start_tls,
        )
        logger.info(f"Successfully dispatched email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to dispatch email to {to_email}: {e}")

async def send_payment_receipt_email(email: str, amount: float, method: str, transaction_id: str):
    """Sends a digital receipt when a user purchases a subscription securely."""
    subject = "TambuaTips VIP Receipt"
    body = f"""
    <p>Thank you for your purchase. Your transaction has been securely mapped to your account.</p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: #061f10; border-radius: 8px; overflow: hidden;">
        <tr><td style="padding: 12px; border-bottom: 1px solid #144023; color: #a1a1aa;">Amount</td><td style="padding: 12px; border-bottom: 1px solid #144023; color: #ffffff; text-align: right; font-weight: bold;">{amount}</td></tr>
        <tr><td style="padding: 12px; border-bottom: 1px solid #144023; color: #a1a1aa;">Method</td><td style="padding: 12px; border-bottom: 1px solid #144023; color: #ffffff; text-align: right; font-weight: bold;">{method.upper()}</td></tr>
        <tr><td style="padding: 12px; color: #a1a1aa;">Transaction ID</td><td style="padding: 12px; color: #10b981; text-align: right; font-family: monospace;">{transaction_id}</td></tr>
    </table>
    <p style="margin-top: 20px;">You can now instantly access premium tips across all live hubs on TambuaTips.</p>
    """
    html_content = _generate_html_template("Payment Successful", body, "Access Premium Tips", "https://tambuatips.com/tips")
    await _send_smtp_email(email, subject, html_content)


async def send_welcome_email(email: str, name: str):
    """Sends a warm onboarding email when a user initializes their account via SSO."""
    subject = "Welcome to TambuaTips Intelligence! 🏆"
    body = f"""
    <p>Hello {name},</p>
    <p>We are thrilled to count you as part of our exclusive predictive sports community.</p>
    <p>With your account established securely, you can now seamlessly navigate our data analytics, live scoring arrays, and expert insights dashboards.</p>
    <p>Stop guessing. Start winning.</p>
    """
    html_content = _generate_html_template("Welcome to TambuaTips!", body, "Go To Dashboard", "https://tambuatips.com")
    await _send_smtp_email(email, subject, html_content)


async def send_subscription_expiry_email(email: str, name: str, expiry_date: str):
    """Warns users that their premium subscription is about to expire."""
    subject = "Your TambuaTips VIP Access is Expiring Soon"
    body = f"""
    <p>Hi {name},</p>
    <p>We wanted to give you a quick heads up that your TambuaTips Premium access will expire on <strong>{expiry_date}</strong>.</p>
    <p>Don't miss out on our upcoming exclusive VIP picks and analysis. Renew now to stay ahead of the game.</p>
    """
    html_content = _generate_html_template("Subscription Expiring", body, "Renew Subscription", "https://tambuatips.com/pricing")
    await _send_smtp_email(email, subject, html_content)


async def send_premium_tip_alert_email(email: str, fixture_title: str):
    """Alerts users of a new high-confidence premium tip."""
    subject = f"🔥 New Premium Pick: {fixture_title}"
    body = f"""
    <p>Our analysts have just released a new high-confidence premium pick for <strong>{fixture_title}</strong>.</p>
    <p>This match shows incredible value based on our latest proprietary edge algorithms. Log in now to view the prediction before the odds drop.</p>
    """
    html_content = _generate_html_template("New VIP Pick Available", body, "View The Pick", "https://tambuatips.com/tips")
    await _send_smtp_email(email, subject, html_content)


async def send_broadcast_email(email: str, title: str, message: str, url: str = None):
    """Sends a manual admin-dispatched broadcast email."""
    subject = f"TambuaTips: {title}"
    body = f"""
    <p>{message}</p>
    """
    link = url if url and url.startswith("http") else f"https://tambuatips.com{url or '/'}"
    html_content = _generate_html_template(title, body, "View Details", link)
    await _send_smtp_email(email, subject, html_content)


async def send_affiliate_approved_email(email: str, name: str):
    """Notifies an affiliate that their account has been approved."""
    subject = "🎉 Your TambuaTips Affiliate Account is Approved!"
    body = f"""
    <p>Hi {name},</p>
    <p>Great news! Your TambuaTips Affiliate account has been <strong style="color: #10b981;">approved</strong>.</p>
    <p>You can now start earning commissions by sharing your unique referral link. Every user who signs up and subscribes through your link earns you money.</p>
    <p>Log in to your Affiliate Dashboard to:</p>
    <ul style="margin: 15px 0; padding-left: 20px;">
        <li>Get your unique referral link</li>
        <li>Track clicks, signups, and conversions</li>
        <li>Monitor your commission earnings</li>
        <li>Request payouts</li>
    </ul>
    <p>Welcome to the team — let's grow together! 🚀</p>
    """
    html_content = _generate_html_template("Account Approved!", body, "Go To Affiliate Dashboard", "https://affiliate.tambuatips.com/dashboard")
    await _send_smtp_email(email, subject, html_content)
