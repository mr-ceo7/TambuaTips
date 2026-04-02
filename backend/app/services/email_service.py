import logging

logger = logging.getLogger(__name__)

async def send_verification_email(email: str, code: str):
    """
    Asynchronously send an email verification OTP.
    TODO: Integrate specific SMTP gateway when credentials are listed.
    """
    logger.info("=" * 40)
    logger.info(f"📧 EMAIL DISPATCHED TO: {email}")
    logger.info("=" * 40)
    logger.info(f"SUBJECT: Verify your TambuaTips Account")
    logger.info(f"BODY:")
    logger.info(f"Hello, welcome to TambuaTips! Your verification code is: {code}")
    logger.info(f"Please enter this to activate your account.")
    logger.info("=" * 40)

async def send_password_reset_email(email: str, token: str):
    """
    Asynchronously send a password reset loop token.
    TODO: Integrate specific SMTP gateway when credentials are listed.
    """
    logger.info("=" * 40)
    logger.info(f"📧 EMAIL DISPATCHED TO: {email}")
    logger.info("=" * 40)
    logger.info(f"SUBJECT: TambuaTips Password Reset")
    logger.info(f"BODY:")
    logger.info(f"You requested a password reset. Here is your token: {token}")
    logger.info(f"Enter this back dynamically to reset your payload securely.")
    logger.info("=" * 40)
