import asyncio
import logging
from app.services.email_service import send_welcome_email

logging.basicConfig(level=logging.INFO)

async def main():
    print("Testing SMTP service...")
    email = "kassimmusa322@gmail.com"
    await send_welcome_email(email, "Test Admin")
    print(f"Test complete. Check {email} for the email.")

if __name__ == "__main__":
    asyncio.run(main())
