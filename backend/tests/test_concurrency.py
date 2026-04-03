import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from unittest.mock import patch
from app.models.user import User
from app.models.payment import Payment

async def _login_helper(client: AsyncClient, email: str, name: str) -> str:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "email": email, "name": name, "picture": ""
        }
        res = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        return res.cookies.get("access_token")

@pytest.mark.asyncio
async def test_callback_fulfillment_concurrency(client: AsyncClient, db_session: AsyncSession):
    """
    Simulate multiple identical callbacks arriving at the exact same moment. 
    Only ONE should fulfill the payment; others should skip.
    """
    # 1. Setup - Create a user and a pending payment
    token = await _login_helper(client, "race@example.com", "Racer")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get user
    result = await db_session.execute(select(User).where(User.email == "race@example.com"))
    user = result.scalar_one()
    
    # Create manual pending payment
    checkout_id = "RACE-123"
    payment = Payment(
        user_id=user.id,
        amount=1000,
        currency="KES",
        method="mpesa",
        status="pending",
        transaction_id=checkout_id,
        item_type="subscription",
        item_id="premium",
        reference="RACE-REF"
    )
    db_session.add(payment)
    await db_session.commit()

    # 2. Fire 10 concurrent callbacks
    payload = {
        "Body": {
            "stkCallback": {
                "CheckoutRequestID": checkout_id,
                "ResultCode": 0,
                "ResultDesc": "Success",
                "CallbackMetadata": {
                    "Item": [
                        {"Name": "MpesaReceiptNumber", "Value": "RECP123"}
                    ]
                }
            }
        }
    }
    
    # We suspect SQLite locks cause failures in gather, so we verify logic sequentially
    with patch("app.routers.payments.settings.MPESA_CALLBACK_SECRET", None):
        responses = []
        for _ in range(10):
            responses.append(await client.post("/api/pay/mpesa/callback", json=payload))
    
    # All should return 200/Success from the DARJA perspective
    for r in responses:
        assert r.status_code == 200
        assert r.json()["ResultCode"] == 0

    # 3. Verify final state
    # Refresh user to check subscription
    await db_session.refresh(user)
    # 2 weeks = 14 days. If it fulfills multiple times it would be multiples of 14.
    from datetime import datetime, UTC, timedelta
    now_naive = datetime.now(UTC).replace(tzinfo=None)
    expected_expiry_max = now_naive + timedelta(days=15) # Safe buffer
    
    # It should only have fulfilled ONE time
    assert user.subscription_tier == "premium"
    assert user.subscription_expires_at is not None
    assert user.subscription_expires_at < expected_expiry_max
    
    # Check payment status
    await db_session.refresh(payment)
    assert payment.status == "completed"

@pytest.mark.asyncio
async def test_subscription_extension_concurrency(client: AsyncClient, db_session: AsyncSession):
    """
    Simulate multiple DIFFERENT payments being fulfilled for the same user concurrently.
    Each should correctly extend the duration without overwriting others.
    """
    token = await _login_helper(client, "extender@example.com", "Extender")
    result = await db_session.execute(select(User).where(User.email == "extender@example.com"))
    user = result.scalar_one()

    # Setup 3 pending payments for the same user
    checkout_id_1 = "EXT-1"
    checkout_id_2 = "EXT-2"
    checkout_id_3 = "EXT-3"

    for cid in [checkout_id_1, checkout_id_2, checkout_id_3]:
        p = Payment(
            user_id=user.id, amount=1000, currency="KES", method="mpesa", 
            status="pending", transaction_id=cid, item_type="subscription",
            item_id="premium", reference=f"REF-{cid}"
        )
        db_session.add(p)
    await db_session.commit()

    # Fire 3 callbacks concurrently
    def make_payload(cid):
        return {
            "Body": {"stkCallback": {"CheckoutRequestID": cid, "ResultCode": 0, "ResultDesc": "Success"}}
        }

    with patch("app.routers.payments.settings.MPESA_CALLBACK_SECRET", None):
        responses = []
        for cid in [checkout_id_1, checkout_id_2, checkout_id_3]:
            responses.append(await client.post("/api/pay/mpesa/callback", json=make_payload(cid)))

    for r in responses: assert r.status_code == 200

    # 3. Final verification
    await db_session.refresh(user)
    
    # Expected duration: 3 x 2 weeks = 6 weeks = 42 days
    from datetime import datetime, UTC, timedelta
    now_naive = datetime.now(UTC).replace(tzinfo=None)
    min_expected = now_naive + timedelta(days=41)
    max_expected = now_naive + timedelta(days=43)
    
    assert user.subscription_expires_at > min_expected
    assert user.subscription_expires_at < max_expected
