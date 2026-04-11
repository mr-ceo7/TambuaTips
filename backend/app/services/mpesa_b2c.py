"""
M-Pesa Business-to-Customer (B2C) API service for affiliate payouts.
Uses separate credentials from the STK Push (C2B) integration.
"""

import httpx
import base64
import uuid
from datetime import datetime

from app.config import settings


async def get_b2c_access_token() -> str:
    """Get OAuth token for M-Pesa B2C API."""
    if settings.MPESA_ENV == "sandbox":
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    else:
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    key = settings.MPESA_B2C_CONSUMER_KEY.strip()
    secret = settings.MPESA_B2C_CONSUMER_SECRET.strip()

    if not key or not secret:
        raise Exception("M-Pesa B2C credentials not configured")

    credentials = base64.b64encode(f"{key}:{secret}".encode()).decode()

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(url, headers={"Authorization": f"Basic {credentials}"})
        if resp.status_code != 200:
            raise Exception(f"M-Pesa B2C Token Error: {resp.status_code} - {resp.text}")
        return resp.json()["access_token"]


async def initiate_b2c_payment(phone: str, amount: float, reference: str) -> dict:
    """
    Send money from business to customer via M-Pesa B2C API.
    
    Args:
        phone: Recipient phone number (254...)
        amount: Amount in KES
        reference: Unique reference/occasion string
    
    Returns:
        dict with response from M-Pesa or simulation result
    """
    import re

    # Normalize phone: strip + and spaces, ensure 254 prefix
    phone = re.sub(r'[\s\-\(\)\+]', '', phone)
    if phone.startswith("0"):
        phone = "254" + phone[1:]
    elif not phone.startswith("254"):
        phone = "254" + phone

    if not settings.PAYMENTS_LIVE or not settings.MPESA_B2C_CONSUMER_KEY:
        # Simulate B2C payment in sandbox mode
        return {
            "status": "simulated",
            "ConversationID": f"SIM-B2C-{uuid.uuid4().hex[:10].upper()}",
            "ResponseDescription": "Simulated B2C payment successful",
            "amount": amount,
            "phone": phone,
        }

    token = await get_b2c_access_token()

    if settings.MPESA_ENV == "sandbox":
        url = "https://sandbox.safaricom.co.ke/mpesa/b2c/v3/paymentrequest"
    else:
        url = "https://api.safaricom.co.ke/mpesa/b2c/v3/paymentrequest"

    payload = {
        "OriginatorConversationID": reference,
        "InitiatorName": settings.MPESA_B2C_INITIATOR_NAME,
        "SecurityCredential": settings.MPESA_B2C_SECURITY_CREDENTIAL,
        "CommandID": "BusinessPayment",
        "Amount": int(amount),
        "PartyA": settings.MPESA_B2C_SHORTCODE,
        "PartyB": phone,
        "Remarks": f"TambuaTips Affiliate Payout {reference}",
        "QueueTimeOutURL": settings.MPESA_B2C_TIMEOUT_URL or f"{settings.BACKEND_URL}/api/affiliate/b2c/timeout",
        "ResultURL": settings.MPESA_B2C_CALLBACK_URL or f"{settings.BACKEND_URL}/api/affiliate/b2c/result",
        "Occasion": reference,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        if resp.status_code != 200:
            raise Exception(f"M-Pesa B2C Error: {resp.status_code} - {resp.text}")
        return resp.json()
