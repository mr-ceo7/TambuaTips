import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from unittest.mock import patch

async def _login_helper(client: AsyncClient, email: str, name: str) -> str:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "email": email, "name": name, "picture": ""
        }
        res = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        return res.cookies.get("access_token")

@pytest.mark.asyncio
async def test_mpesa_payment_simulation(client: AsyncClient, db_session: AsyncSession):
    # 1. Login
    token = await _login_helper(client, "buyer@example.com", "Buyer")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Update the newly created user's country to 'KE' so M-Pesa is available
    from app.models.user import User
    from sqlalchemy import update
    await db_session.execute(update(User).values(country='KE'))
    await db_session.commit()

    # 2. Initiate M-Pesa Payment (Simulated)
    pay_data = {
        "item_type": "subscription",
        "item_id": "premium",
        "duration_weeks": 2,
        "phone": "254700000000"
    }
    
    # We enforce non-live mode, the route auto-completes and grants the tier
    with patch("app.routers.payments.settings.PAYMENTS_LIVE", False):
        response = await client.post("/api/pay/mpesa", json=pay_data, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["completed", "pending"]

    # 3. Verify user subscription updated
    res = await client.get("/api/auth/me", headers=headers)
    user_data = res.json()
    assert user_data["subscription_tier"] == "premium"
    assert user_data["subscription_expires_at"] is not None

@pytest.mark.asyncio
async def test_payment_invalid_tier(client: AsyncClient, db_session: AsyncSession):
    token = await _login_helper(client, "buyer2@example.com", "Buyer 2")
    
    from app.models.user import User
    from sqlalchemy import update
    await db_session.execute(update(User).values(country='KE'))
    await db_session.commit()
    
    pay_data = {
        "item_type": "subscription",
        "item_id": "non_existent_tier",
        "duration_weeks": 2,
        "phone": "254700000000"
    }
    response = await client.post(
        "/api/pay/mpesa", 
        json=pay_data, 
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 400
    assert "Invalid tier" in response.text or "Invalid subscription tier" in response.text

@pytest.mark.asyncio
async def test_mpesa_callback_stub(client: AsyncClient):
    # Callback exists and handles invalid payload gracefully
    with patch("app.routers.payments.settings.MPESA_CALLBACK_SECRET", None):
        payload = {"Body": {"stkCallback": {"CheckoutRequestID": "SIM-abc", "ResultCode": 0}}}
        response = await client.post("/api/pay/mpesa/callback", json=payload)
        assert response.status_code == 200
