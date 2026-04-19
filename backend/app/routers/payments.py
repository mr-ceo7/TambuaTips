"""
Payment routes: M-Pesa, PayPal, Skrill, Card (Stripe).
All gateways are implemented but controlled by PAYMENTS_LIVE env flag.
"""

import asyncio
import uuid
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.config import settings
from app.dependencies import get_db, get_current_user
from app.services.payment_gateway import initiate_mpesa_stk
from app.models.user import User
from app.models.payment import Payment
from app.models.campaign import Campaign
from app.models.jackpot import Jackpot, JackpotPurchase
from app.models.subscription import SubscriptionTier
from app.models.affiliate import Affiliate, AffiliateConversion, AffiliateCommissionConfig
from app.schemas.payment import MpesaPaymentRequest, PaymentRequest, PaymentResponse, MpesaCallbackData
from app.services.email_service import send_payment_receipt_email
from app.services.subscription_access import grant_subscription_entitlement, sync_user_subscription_summary

router = APIRouter(prefix="/api/pay", tags=["Payments"])


# ── Helpers ──────────────────────────────────────────────────

async def _resolve_amount(body: PaymentRequest, user: User, db: AsyncSession) -> tuple[float, str]:
    """Resolve the currency amount and currency code from the item being purchased based on the user's region."""
    from app.services.pricing import get_pricing_region
    region = await get_pricing_region(db, user.country or "US")
    currency = region.currency if region else "KES"
    
    if body.item_type == "subscription":
        result = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == body.item_id))
        tier = result.scalar_one_or_none()
        if not tier:
            raise HTTPException(status_code=400, detail="Invalid subscription tier")
            
        amount = tier.price_2wk if body.duration_weeks == 2 else tier.price_4wk
        
        if region and tier.regional_prices and region.region_code in tier.regional_prices:
            overrides = tier.regional_prices[region.region_code]
            amount = overrides.get("price_2wk" if body.duration_weeks == 2 else "price_4wk", amount)
            
        # Check active campaigns for discounts
        now = datetime.now(UTC).replace(tzinfo=None)
        active_campaign = await db.execute(
            select(Campaign)
            .where(
                Campaign.is_active == True,
                Campaign.start_date <= now,
                Campaign.end_date >= now
            )
            .order_by(Campaign.start_date.desc())
            .limit(1)
        )
        campaign = active_campaign.scalar_one_or_none()
        if campaign and campaign.incentive_type == "discount":
            discount = amount * (campaign.incentive_value / 100.0)
            amount = max(0, amount - discount)
            
        # Check Referral Economy Discounts
        if user.referral_discount_active:
            from app.routers.admin import get_referral_settings
            ref_settings = await get_referral_settings(db)
            disc_pct = ref_settings.get("discount_percentage", 50)
            discount = amount * (disc_pct / 100.0)
            amount = max(0, amount - discount)
            
        return float(amount), currency
        
    elif body.item_type == "jackpot":
        result = await db.execute(select(Jackpot).where(Jackpot.id == int(body.item_id)))
        jp = result.scalar_one_or_none()
        if not jp:
            raise HTTPException(status_code=400, detail="Invalid jackpot ID")
            
        # Prevent double purchases
        existing_purchase = await db.execute(select(JackpotPurchase).where(JackpotPurchase.user_id == user.id, JackpotPurchase.jackpot_id == jp.id))
        if existing_purchase.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Jackpot already purchased")
            
        amount = jp.price
        if region and jp.regional_prices and region.region_code in jp.regional_prices:
            overrides = jp.regional_prices[region.region_code]
            amount = overrides.get("price", amount)
            
        # Check Referral Economy Discounts for Jackpots too
        if user.referral_discount_active:
            from app.routers.admin import get_referral_settings
            ref_settings = await get_referral_settings(db)
            disc_pct = ref_settings.get("discount_percentage", 50)
            discount = amount * (disc_pct / 100.0)
            amount = max(0, amount - discount)
            
        return float(amount), currency
    elif body.item_type == "jackpot_bundle":
        result = await db.execute(select(Jackpot).where(Jackpot.result == "pending"))
        pending_jackpots = result.scalars().all()
        if not pending_jackpots:
            raise HTTPException(status_code=400, detail="No pending jackpots available to bundle")
            
        total_price = 0
        jackpot_ids = []
        for jp in pending_jackpots:
            # Check if user already bought it
            existing_purchase = await db.execute(select(JackpotPurchase).where(JackpotPurchase.user_id == user.id, JackpotPurchase.jackpot_id == jp.id))
            if existing_purchase.scalar_one_or_none():
                continue
            
            amount = jp.price
            if region and jp.regional_prices and region.region_code in jp.regional_prices:
                overrides = jp.regional_prices[region.region_code]
                amount = overrides.get("price", amount)
                
            total_price += amount
            jackpot_ids.append(jp.id)
            
        if total_price == 0:
            raise HTTPException(status_code=400, detail="You have already purchased all available jackpots")
            
        # Apply bundle discount from settings
        from app.routers.admin import get_referral_settings
        ref_settings = await get_referral_settings(db)
        bundle_discount_pct = float(ref_settings.get("jackpot_bundle_discount", 20))
        
        discount = total_price * (bundle_discount_pct / 100.0)
        total_price = max(0, total_price - discount)
        
        # Check Referral Economy Discounts
        if user.referral_discount_active:
            disc_pct = float(ref_settings.get("discount_percentage", 50))
            referral_discount = total_price * (disc_pct / 100.0)
            total_price = max(0, total_price - referral_discount)
            
        # Store jackpot_ids in item_id separated by commas to process later
        body.item_id = ",".join(map(str, jackpot_ids))
        
        return float(total_price), currency
    else:
        raise HTTPException(status_code=400, detail="Invalid item_type")


async def _fulfill_payment(payment: Payment, user: User, db: AsyncSession):
    """After successful payment, grant access to the purchased item."""
    # Ensure user is fully locked for this transaction to prevent overlapping updates
    user_res = await db.execute(
        select(User)
        .options(selectinload(User.subscription_entitlement_rows))
        .where(User.id == user.id)
        .with_for_update()
    )
    locked_user = user_res.scalar_one()

    # Consume active referral discount upon successful purchase
    if locked_user.referral_discount_active:
        locked_user.referral_discount_active = False

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

        # Check active campaign for extra days
        now_dt = datetime.now(UTC).replace(tzinfo=None)
        active_campaign = await db.execute(
            select(Campaign)
            .where(
                Campaign.is_active == True,
                Campaign.start_date <= now_dt,
                Campaign.end_date >= now_dt
            )
            .order_by(Campaign.start_date.desc())
            .limit(1)
        )
        campaign = active_campaign.scalar_one_or_none()
        bonus_days = 0
        if campaign and campaign.incentive_type == "extra_days":
            bonus_days = int(campaign.incentive_value)
        
        grant_subscription_entitlement(
            locked_user,
            tier_id=payment.item_id,
            duration_days=(weeks * 7) + bonus_days,
            payment_id=payment.id,
            source="payment",
            now=now_dt,
        )

    elif payment.item_type == "jackpot":
        purchase = JackpotPurchase(
            user_id=locked_user.id,
            jackpot_id=int(payment.item_id),
            payment_id=payment.id,
        )
        db.add(purchase)

    elif payment.item_type == "jackpot_bundle":
        if payment.item_id:
            jackpot_ids = [int(x) for x in payment.item_id.split(",") if x.isdigit()]
            for jp_id in jackpot_ids:
                purchase = JackpotPurchase(
                    user_id=locked_user.id,
                    jackpot_id=jp_id,
                    payment_id=payment.id,
                )
                db.add(purchase)

    sync_user_subscription_summary(locked_user)

    # === Affiliate Commission Logic ===
    if locked_user.affiliate_id:
        result_aff = await db.execute(select(Affiliate).where(Affiliate.id == locked_user.affiliate_id))
        affiliate = result_aff.scalar_one_or_none()
        
        if affiliate and affiliate.status == "approved":
            # Find commission config for this item
            q_conf = select(AffiliateCommissionConfig).where(
                AffiliateCommissionConfig.item_type == payment.item_type
            )
            
            # Subscriptions match by tier_id and duration (2wk/4wk)
            weeks_val = locals().get("weeks", 2)
            if payment.item_type == "subscription":
                dur = "4wk" if weeks_val == 4 else "2wk"
                q_conf = q_conf.where(
                    AffiliateCommissionConfig.tier_id == payment.item_id,
                    AffiliateCommissionConfig.duration == dur
                )
                
            res_conf = await db.execute(q_conf)
            config = res_conf.scalar_one_or_none()
            
            if config:
                # Determine if this is a first-time purchase or renewal
                prev_purchases = await db.execute(
                    select(func.count(AffiliateConversion.id))
                    .where(
                        AffiliateConversion.affiliate_id == affiliate.id,
                        AffiliateConversion.user_id == locked_user.id,
                        AffiliateConversion.conversion_type == "purchase"
                    )
                )
                is_first_purchase = (prev_purchases.scalar() == 0)
                
                if is_first_purchase or config.earn_on_renewal:
                    affiliate_commission = float(payment.amount) * config.commission_percent / 100.0
                    admin_commission = 0.0
                    
                    if affiliate.affiliate_admin_id:
                        admin_commission = affiliate_commission * config.affiliate_admin_commission_percent / 100.0
                        
                        # Apply admin commission to the admin
                        res_admin = await db.execute(select(Affiliate).where(Affiliate.id == affiliate.affiliate_admin_id))
                        affiliate_admin = res_admin.scalar_one_or_none()
                        if affiliate_admin:
                            affiliate_admin.commission_earned = (affiliate_admin.commission_earned or 0.0) + admin_commission
                            db.add(affiliate_admin)

                    conversion = AffiliateConversion(
                        affiliate_id=affiliate.id,
                        user_id=locked_user.id,
                        conversion_type="purchase",
                        payment_id=payment.id,
                        amount=float(payment.amount),
                        commission_amount=affiliate_commission,
                        affiliate_admin_commission=admin_commission
                    )
                    db.add(conversion)
                    
                    affiliate.total_revenue = (affiliate.total_revenue or 0.0) + affiliate_commission
                    affiliate.commission_earned = (affiliate.commission_earned or 0.0) + affiliate_commission
                    db.add(affiliate)

    await db.commit()
    
    import asyncio
    asyncio.create_task(
        send_payment_receipt_email(
            email=locked_user.email,
            amount=float(payment.amount),
            method=payment.method,
            transaction_id=payment.transaction_id or payment.reference
        )
    )
    
    # Track Campaign Purchase globally
    from app.routers.campaigns import track_campaign_event
    asyncio.create_task(
        track_campaign_event("purchase", float(payment.amount))
    )


# ── M-Pesa ───────────────────────────────────────────────────

@router.post("/mpesa", response_model=PaymentResponse)
async def pay_mpesa(body: MpesaPaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount, currency = await _resolve_amount(body, user, db)
    if currency != "KES":
        raise HTTPException(status_code=400, detail="M-Pesa payments are only available in Kenya (KES)")
        
    reference = f"TT-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency=currency,
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
        try:
            result = await initiate_mpesa_stk(phone=body.phone, amount=amount, reference=reference)
            payment.gateway_response = str(result)
            
            # Safaricom returns 'CheckoutRequestID' on success
            if result.get("ResponseCode") == "0":
                payment.transaction_id = result.get("CheckoutRequestID")
                await db.commit()
            else:
                payment.status = "failed"
                await db.commit()
        except Exception as e:
            import traceback
            payment.status = "error"
            payment.gateway_response = repr(e)
            await db.commit()
            print(f"M-Pesa Exact Error: {repr(e)}")
            traceback.print_exc()
            detail = f"M-Pesa initiation failed: {repr(e)}" if settings.PAYMENTS_LIVE and settings.DEBUG else "M-Pesa initiation failed. Please try again later."
            raise HTTPException(status_code=502, detail=detail)
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
async def mpesa_callback(request: Request, secret: str = None, db: AsyncSession = Depends(get_db)):
    """M-Pesa STK Push callback webhook (Daraja API)."""
    if settings.MPESA_CALLBACK_SECRET and secret != settings.MPESA_CALLBACK_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    data = await request.json()
    stk_callback = data.get("Body", {}).get("stkCallback", {})
    
    checkout_request_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    result_desc = stk_callback.get("ResultDesc")
    
    if not checkout_request_id:
        return {"ResultCode": 1, "ResultDesc": "Invalid Callback"}

    # Find the matching payment securely with row lock
    result = await db.execute(
        select(Payment).where(Payment.transaction_id == checkout_request_id).with_for_update()
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        return {"ResultCode": 1, "ResultDesc": "Payment Not Found"}

    # Find user
    user_result = await db.execute(select(User).where(User.id == payment.user_id))
    user = user_result.scalar_one_or_none()

    if result_code == 0:
        if payment.status != "completed":
            # Success
            payment.status = "completed"
            # Extract MpesaReceiptNumber if available
            meta = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            receipt = next((item["Value"] for item in meta if item["Name"] == "MpesaReceiptNumber"), None)
            if receipt:
                payment.reference = receipt
            
            if user:
                await _fulfill_payment(payment, user, db)
    else:
        # Error/Canceled
        if payment.status != "completed":
            payment.status = "failed"
            payment.gateway_response = result_desc

    await db.commit()
    return {"ResultCode": 0, "ResultDesc": "Success"}


# ── PayPal ───────────────────────────────────────────────────

@router.post("/paypal", response_model=PaymentResponse)
async def pay_paypal(body: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount, currency = await _resolve_amount(body, user, db)
    reference = f"TT-PP-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency=currency,
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
        from app.services.payment_gateway import create_paypal_order
        from app.services.exchange_rate import get_kes_to_usd_rate
        print("Creating PayPal Order...")
        try:
            if currency == "USD":
                usd_amount = amount
            else:
                live_rate = await get_kes_to_usd_rate()
                usd_amount = round(amount / live_rate, 2)
                
            if usd_amount < 0.01: usd_amount = 0.01

            order = await create_paypal_order(usd_amount, reference=reference, currency="USD")
            payment.gateway_response = str(order)
            payment.transaction_id = order.get("id")
            
            links = order.get("links", [])
            auth_url = next((link["href"] for link in links if link.get("rel") == "approve"), None)
            
            if auth_url:
                payment.auth_url = auth_url
            else:
                raise HTTPException(status_code=500, detail="Failed to retrieve PayPal approval URL")
                
            await db.commit()
        except Exception as e:
            payment.status = "error"
            payment.gateway_response = str(e)
            await db.commit()
            err_msg = str(e)
            print(f"PayPal Order Error: {err_msg}")
            detail = f"PayPal gateway error: {err_msg}" if settings.DEBUG else "PayPal gateway error. Please try again later."
            raise HTTPException(status_code=502, detail=detail)
    else:
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-PP-{uuid.uuid4().hex[:10].upper()}"
        payment.auth_url = f"{settings.BACKEND_URL}/api/pay/paypal/capture?token={payment.transaction_id}&PayerID=SIM"  # Sandbox only
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment

@router.get("/paypal/capture")
async def capture_paypal(token: str, PayerID: str, db: AsyncSession = Depends(get_db)):
    """Callback when user approves PayPal payment."""
    from app.services.payment_gateway import capture_paypal_order
    
    result = await db.execute(select(Payment).where(Payment.transaction_id == token).with_for_update())
    payment = result.scalar_one_or_none()
    
    if not payment:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=cancel")
        
    if payment.status == "completed":
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=success")
        
    if settings.PAYMENTS_LIVE:
        try:
            capture_resp = await capture_paypal_order(token)
            payment.gateway_response += "\\n" + str(capture_resp)
            status_val = capture_resp.get("status")
            
            if status_val == "COMPLETED":
                payment.status = "completed"
                user_result = await db.execute(select(User).where(User.id == payment.user_id))
                user = user_result.scalar_one()
                await db.commit()
                await _fulfill_payment(payment, user, db)
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=success")
            else:
                payment.status = "failed"
                await db.commit()
                return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=cancel")
        except Exception as e:
            print(f"PayPal Capture Error: {e}")
            payment.status = "failed"
            await db.commit()
            return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=cancel")
    else:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/?payment=success")


# ── Skrill ───────────────────────────────────────────────────

@router.post("/skrill", response_model=PaymentResponse)
async def pay_skrill(body: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount, currency = await _resolve_amount(body, user, db)
    reference = f"TT-SK-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency=currency,
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


# ── Paystack ─────────────────────────────────────────────────

@router.post("/paystack", response_model=PaymentResponse)
async def pay_paystack(body: PaymentRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    amount, currency = await _resolve_amount(body, user, db)
    reference = f"TT-PS-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment(
        user_id=user.id,
        amount=amount,
        currency=currency,
        method="paystack",
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
        try:
            from app.services.payment_gateway import initialize_paystack_transaction
            paystack_res = await initialize_paystack_transaction(amount=amount, email=user.email, reference=reference)
            # Add these properties directly so they can be returned in the response
            # Note: auth_url and access_code are in our updated schema
            payment.auth_url = paystack_res.get("authorization_url")
            payment.access_code = paystack_res.get("access_code")
        except Exception as e:
            payment.status = "error"
            payment.gateway_response = str(e)
            await db.commit()
            detail = f"Paystack error: {e}" if settings.DEBUG else "Payment initialization failed. Please try again later."
            raise HTTPException(status_code=500, detail=detail)
    else:
        await asyncio.sleep(1)
        payment.status = "completed"
        payment.transaction_id = f"SIM-PS-{uuid.uuid4().hex[:10].upper()}"
        await db.commit()
        await _fulfill_payment(payment, user, db)
        await db.refresh(payment)

    return payment


@router.post("/paystack/webhook")
async def paystack_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Paystack Webhook for successful transactions."""
    import hashlib
    import hmac
    
    # Verify Paystack signature
    payload = await request.body()
    signature = request.headers.get("x-paystack-signature")
    
    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")
        
    hash_value = hmac.new(settings.PAYSTACK_SECRET_KEY.encode('utf-8'), payload, hashlib.sha512).hexdigest()
    if hash_value != signature:
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()
    event = data.get("event")
    
    if event == "charge.success":
        reference = data.get("data", {}).get("reference")
        # Find payment by reference with row lock
        result = await db.execute(select(Payment).where(Payment.reference == reference).with_for_update())
        payment = result.scalar_one_or_none()
        
        if payment and payment.status != "completed":
            # Strict amount validation to prevent partial payment bypass
            paystack_amount = data.get("data", {}).get("amount", 0) / 100
            if float(payment.amount) != float(paystack_amount):
                payment.status = "failed"
                payment.gateway_response = f"Amount mismatch: Expected {payment.amount}, received {paystack_amount}"
                await db.commit()
                return {"status": "error", "message": "Amount mismatch"}

            payment.status = "completed"
            payment.transaction_id = str(data.get("data", {}).get("id"))
            
            # Find user
            user_result = await db.execute(select(User).where(User.id == payment.user_id))
            user = user_result.scalar_one_or_none()
            if user:
                await _fulfill_payment(payment, user, db)
                
            await db.commit()
            
    return {"status": "success"}


# ── Status Check ─────────────────────────────────────────────

@router.get("/status/{payment_id}", response_model=PaymentResponse)
async def get_payment_status(payment_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    """Check the real-time status of a payment."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
        
    if payment.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this payment")
        
    return payment
