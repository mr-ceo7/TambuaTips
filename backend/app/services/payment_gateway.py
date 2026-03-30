"""
Payment gateway service — real implementations for M-Pesa, PayPal, Skrill, and Stripe.
Each function is called ONLY when PAYMENTS_LIVE=true.

These are the production-ready stubs. Fill in the actual API calls when you have credentials.
"""

import httpx
import base64
from datetime import datetime
from typing import Optional

from app.config import settings


# ─────────────────────────────────────────────────────────────
# M-Pesa (Safaricom Daraja API)
# ─────────────────────────────────────────────────────────────

async def get_mpesa_access_token() -> str:
    """Get OAuth token from Daraja API."""
    if settings.MPESA_ENV == "sandbox":
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    else:
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"

    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers={"Authorization": f"Basic {credentials}"})
        data = resp.json()
        return data["access_token"]


async def initiate_mpesa_stk(phone: str, amount: int, reference: str) -> dict:
    """Initiate M-Pesa STK Push."""
    token = await get_mpesa_access_token()

    if settings.MPESA_ENV == "sandbox":
        url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    else:
        url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}".encode()
    ).decode()

    payload = {
        "BusinessShortCode": settings.MPESA_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": amount,
        "PartyA": phone,
        "PartyB": settings.MPESA_SHORTCODE,
        "PhoneNumber": phone,
        "CallBackURL": settings.MPESA_CALLBACK_URL,
        "AccountReference": reference,
        "TransactionDesc": f"TambuaTips Payment {reference}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        return resp.json()


# ─────────────────────────────────────────────────────────────
# PayPal (REST API v2)
# ─────────────────────────────────────────────────────────────

async def get_paypal_access_token() -> str:
    if settings.PAYPAL_MODE == "sandbox":
        url = "https://api-m.sandbox.paypal.com/v1/oauth2/token"
    else:
        url = "https://api-m.paypal.com/v1/oauth2/token"

    credentials = base64.b64encode(
        f"{settings.PAYPAL_CLIENT_ID}:{settings.PAYPAL_CLIENT_SECRET}".encode()
    ).decode()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            data={"grant_type": "client_credentials"},
            headers={"Authorization": f"Basic {credentials}"},
        )
        if resp.status_code != 200:
            raise Exception(f"PayPal token error {resp.status_code}: {resp.text}")
        return resp.json()["access_token"]


async def create_paypal_order(amount: float, reference: str, currency: str = "USD") -> dict:
    """Create a PayPal order."""
    token = await get_paypal_access_token()

    if settings.PAYPAL_MODE == "sandbox":
        url = "https://api-m.sandbox.paypal.com/v2/checkout/orders"
    else:
        url = "https://api-m.paypal.com/v2/checkout/orders"

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [{
            "reference_id": reference,
            "amount": {"currency_code": currency, "value": f"{float(amount):.2f}"},
        }],
        "application_context": {
            "return_url": "http://localhost:8000/api/pay/paypal/capture",
            "cancel_url": "http://localhost:3000",
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        if resp.status_code not in (200, 201):
            raise Exception(f"PayPal order error {resp.status_code}: {resp.text}")
        return resp.json()


async def capture_paypal_order(order_id: str) -> dict:
    token = await get_paypal_access_token()

    if settings.PAYPAL_MODE == "sandbox":
        url = f"https://api-m.sandbox.paypal.com/v2/checkout/orders/{order_id}/capture"
    else:
        url = f"https://api-m.paypal.com/v2/checkout/orders/{order_id}/capture"

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        return resp.json()


# ─────────────────────────────────────────────────────────────
# Skrill (Quick Checkout)
# ─────────────────────────────────────────────────────────────

async def create_skrill_session(amount: int, reference: str, email: str) -> dict:
    """Create a Skrill Quick Checkout URL."""
    url = "https://pay.skrill.com"

    payload = {
        "pay_to_email": settings.SKRILL_MERCHANT_ID,
        "amount": str(amount),
        "currency": "KES",
        "transaction_id": reference,
        "return_url": settings.SKRILL_RETURN_URL,
        "cancel_url": settings.SKRILL_CANCEL_URL,
        "prepare_only": "1",
        "pay_from_email": email,
        "detail1_description": "TambuaTips Premium",
        "detail1_text": f"Payment {reference}",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data=payload)
        return {"session_id": resp.text.strip(), "redirect_url": f"{url}?sid={resp.text.strip()}"}


# ─────────────────────────────────────────────────────────────
# Paystack (Card/Visa/Mobile Money)
# ─────────────────────────────────────────────────────────────

async def initialize_paystack_transaction(amount: int, email: str, reference: str, currency: str = "KES") -> dict:
    """Initialize a Paystack transaction."""
    url = "https://api.paystack.co/transaction/initialize"

    payload = {
        "amount": amount * 100,  # Paystack uses smallest currency unit (kobo/cents)
        "email": email,
        "currency": currency,
        "reference": reference,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            json=payload,
            headers={
                "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
                "Content-Type": "application/json"
            },
        )
        resp_data = resp.json()
        if not resp_data.get("status"):
            raise ValueError(f"Paystack error: {resp_data.get('message')}")
        return resp_data["data"]
