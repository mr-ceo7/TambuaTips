import logging
from email.message import EmailMessage
import aiosmtplib
from app.config import settings

logger = logging.getLogger(__name__)

async def _send_smtp_email(to_email: str, subject: str, html_content: str):
    """
    Core function to dispatch emails via aiosmtplib.
    """
    if not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP_PASSWORD not set. Simulating email to {to_email}")
        logger.info(f"Subject: {subject}\nBody: {html_content}")
        return

    message = EmailMessage()
    message["From"] = settings.FROM_EMAIL
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(html_content, subtype="html")

    try:
        # Use starttls=True if using port 587, use_tls=True if using port 465
        use_tls = True if settings.SMTP_PORT == 465 else False
        start_tls = True if settings.SMTP_PORT == 587 else False

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_SERVER,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            use_tls=use_tls,
            start_tls=start_tls,
        )
        logger.info(f"Successfully dispatched email to {to_email}")
    except Exception as e:
        logger.error(f"Failed to dispatch email to {to_email}: {e}")

async def send_payment_receipt_email(email: str, amount: float, method: str, transaction_id: str):
    """
    Sends a digital receipt when a user purchases a subscription securely.
    """
    subject = "TambuaTips VIP Receipt"
    html_content = f"""
    <h2>Thank you for your purchase!</h2>
    <p>Your transaction has been securely mapped to your account.</p>
    <ul>
        <li><strong>Amount:</strong> {amount}</li>
        <li><strong>Method:</strong> {method.upper()}</li>
        <li><strong>Transaction ID:</strong> {transaction_id}</li>
    </ul>
    <p>You can now instantly access premium tips across all live hubs on TambuaTips.</p>
    <br/>
    <p>Best regards,<br/>The TambuaTips Intelligence Team</p>
    """
    await _send_smtp_email(email, subject, html_content)

async def send_welcome_email(email: str, name: str):
    """
    Sends a warm onboarding email when a user initializes their account via SSO.
    """
    subject = "Welcome to TambuaTips Intelligence! 🏆"
    html_content = f"""
    <h2>Hello {name}, welcome to TambuaTips!</h2>
    <p>We are thrilled to count you as part of our exclusive predictive sports community.</p>
    <p>With your account established securely, you can now seamlessly navigate our data analytics, live scoring arrays, and expert insights dashboards.</p>
    <p>Stop guessing. Start winning.</p>
    <br/>
    <p>Best regards,<br/>The TambuaTips Intelligence Team</p>
    """
    await _send_smtp_email(email, subject, html_content)
