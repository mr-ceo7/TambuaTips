import asyncio
import logging
import sys
from datetime import datetime, timedelta

from app.services.email_service import (
    send_welcome_email,
    send_payment_receipt_email,
    send_subscription_expiry_email,
    send_premium_tip_alert_email,
    send_broadcast_email,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s", stream=sys.stdout)

async def test_all_scenarios():
    test_email = "kassimmusa322@gmail.com"
    test_name = "Kassim"
    
    print("\n" + "="*50)
    print(f"🚀 INITIATING TAMBUATIPS SMTP TERMINAL TESTS")
    print(f"📧 Target Address: {test_email}")
    print("="*50 + "\n")

    # 1. Welcome Email
    print("[1/5] Dispatching Welcome Email...")
    await send_welcome_email(test_email, test_name)
    await asyncio.sleep(2)

    # 2. Payment Receipt
    print("\n[2/5] Dispatching Payment Receipt...")
    await send_payment_receipt_email(test_email, 2500.0, "mpesa", "TEST12345678")
    await asyncio.sleep(2)

    # 3. Subscription Expiry Warning
    print("\n[3/5] Dispatching Subscription Expiry Warning...")
    expiry = (datetime.now() + timedelta(days=2)).strftime("%B %d, %Y")
    await send_subscription_expiry_email(test_email, test_name, expiry)
    await asyncio.sleep(2)

    # 4. Premium Tip Alert
    print("\n[4/5] Dispatching Premium Tip Alert...")
    await send_premium_tip_alert_email(test_email, "Arsenal vs Manchester City (Over 2.5 Goals)")
    await asyncio.sleep(2)

    # 5. Broadcast Email
    print("\n[5/5] Dispatching Custom Admin Broadcast...")
    await send_broadcast_email(
        test_email, 
        title="⚠️ Critical Platform Update", 
        message="The M-Pesa gateway is currently undergoing maintenance. Payments may be delayed by up to 10 minutes.",
        url="/about"
    )
    
    print("\n" + "="*50)
    print("✅ ALL TESTS COMPLETED SUCCESSFULLY!")
    print("="*50 + "\n")


if __name__ == "__main__":
    asyncio.run(test_all_scenarios())
