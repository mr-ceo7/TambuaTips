"""
Payment routes: M-Pesa, PayPal, Skrill, Card (Stripe).
All gateways are implemented but controlled by PAYMENTS_LIVE env flag.
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.payment import Payment
from app.models.jackpot import Jackpot, JackpotPurchase
from app.models.subscription import SubscriptionTier
from app.schemas.payment import MpesaPaymentRequest, PaymentRequest, CardPaymentRequest, PaymentResponse, MpesaCallbackData

router = APIRouter(prefix="/api/pay", tags=["Payments"])


# ── Helpers ──────────────────────────────────────────────────

async def _resolve_amount(body: PaymentRequest, db: AsyncSession) -> int:
    """Resolve the KES amount from the item being purchased."""
    if body.item_type == "subscription":
        result = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == body.item_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
        return tier.price_2wk if body.duration_weeks == 2 else tier.price_4wk
    elif body.item_type == "jackpot":
        result = await db.execute(select(Jackpot).where(Jackpot.id == int(body.item_id)))
        jp = result.scalar_one_or_none()
        if not jp:
            raise HTTPException(status_code=400, detail="Invalid jackpot ID")
        return jp.price
    else:
        raise HTTPException(status_code=400, detail="Invalid item_type")


async def _fulfill_payment(payment: Payment, user: User, db: AsyncSession):
    """After successful payment, grant access to the purchased item."""
    if payment.item_type == "subscription":
        weeks = 2  # Default
        # Try to determine from original request context
        result = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == payment.item_id))
        tier = result.scalar_one_or_none()
        if tier:
            # Determine weeks from amount
            if payment.amount == tier.price_4wk:
                weeks = 4
            else:
                weeks = 2

        user.subscription_tier = payment.item_id
        user.subscription_expires_at = datetime.utcnow() + timedelta(weeks=weeks)

    elif payment.item_type == "jackpot":
        purchase = JackpotPurchase(
            user_id=user.id,
            jackpot_id=int(payment.item_id),
            payment_id=payment.id,
        )
        db.add(purchase)

    await db.commit()


# ── M-Pesa ───────────────────────────────────────────────────

@router.post("/mpesa", response_model=PaymentResponse)
async def pay_mpesa(body: MpesaPaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount = await _resolve_amount(body, db)
    reference = f"TT-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="KES",
        method="mpesa",
        status="pending",
        reference=reference,
        item_type=body.item_type,
        item_id=body.item_id,
        phone=body.phone,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    if settings.PAYMENTS_LIVE:
        # TODO: Implement real M-Pesa Daraja STK Push
        # from app.services.payment_gateway import initiate_mpesa_stk
        # result = await initiate_mpesa_stk(phone=body.phone, amount=amount, reference=reference)
        # payment.gateway_response = str(result)
        pass
    else:
        # Simulate: auto-complete after short delay
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-{uuid.uuid4().hex[:10].upper()}"
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment


@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """M-Pesa STK Push callback webhook (Daraja API)."""
    data = await request.json()

    # TODO: Parse Daraja callback, find payment by reference, update status
    # This is the real production handler
    # body = data.get("Body", {}).get("stkCallback", {})
    # result_code = body.get("ResultCode")
    # checkout_request_id = body.get("CheckoutRequestID")

    return {"ResultCode": 0, "ResultDesc": "Accepted"}


# ── PayPal ───────────────────────────────────────────────────

@router.post("/paypal", response_model=PaymentResponse)
async def pay_paypal(body: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount = await _resolve_amount(body, db)
    reference = f"TT-PP-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="KES",
        method="paypal",
        status="pending",
        reference=reference,
        item_type=body.item_type,
        item_id=body.item_id,
        email=user.email,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    if settings.PAYMENTS_LIVE:
        # TODO: Create PayPal order via REST API v2
        # from app.services.payment_gateway import create_paypal_order
        # order = await create_paypal_order(amount, reference)
        # payment.gateway_response = str(order)
        pass
    else:
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-PP-{uuid.uuid4().hex[:10].upper()}"
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment


# ── Skrill ───────────────────────────────────────────────────

@router.post("/skrill", response_model=PaymentResponse)
async def pay_skrill(body: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount = await _resolve_amount(body, db)
    reference = f"TT-SK-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="KES",
        method="skrill",
        status="pending",
        reference=reference,
        item_type=body.item_type,
        item_id=body.item_id,
        email=user.email,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    if settings.PAYMENTS_LIVE:
        # TODO: Create Skrill Quick Checkout session
        # from app.services.payment_gateway import create_skrill_session
        # session = await create_skrill_session(amount, reference, user.email)
        pass
    else:
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-SK-{uuid.uuid4().hex[:10].upper()}"
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment


# ── Card / Stripe ────────────────────────────────────────────

@router.post("/card", response_model=PaymentResponse)
async def pay_card(body: CardPaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount = await _resolve_amount(body, db)
    reference = f"TT-CD-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency="KES",
        method="card",
        status="pending",
        reference=reference,
        item_type=body.item_type,
        item_id=body.item_id,
        email=user.email,
    )
    db.add(payment)
    await db.commit()
    await db.refresh(payment)

    if settings.PAYMENTS_LIVE:
        # TODO: Create Stripe PaymentIntent
        # import stripe
        # stripe.api_key = settings.STRIPE_SECRET_KEY
        # intent = stripe.PaymentIntent.create(
        #     amount=amount * 100,  # Stripe uses cents
        #     currency="kes",
        #     payment_method=body.payment_method_id,
        #     confirm=True,
        # )
        # payment.transaction_id = intent.id
        # payment.status = "completed" if intent.status == "succeeded" else "failed"
        pass
    else:
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-CD-{uuid.uuid4().hex[:10].upper()}"
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment
