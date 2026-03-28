import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.payment import Payment

@pytest.mark.asyncio
async def test_mpesa_payment_simulation(client: AsyncClient, db_session: AsyncSession):
    # 1. Register & Login
    reg_data = {"name": "Buyer", "email": "buyer@example.com", "password": "password"}
    await client.post("/api/auth/register", json=reg_data)
    res = await client.post("/api/auth/login", json={"email": "buyer@example.com", "password": "password"})
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Initiate M-Pesa Payment (Simulated)
    pay_data = {
        "item_type": "subscription",
        "item_id": "premium",
        "duration_weeks": 2,
        "phone": "254700000000"
    }
    # Note: Simulations have 1s sleep, but AsyncClient handles it
    response = await client.post("/api/pay/mpesa", json=pay_data, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["amount"] == 1000

    # 3. Verify user subscription updated
    res = await client.get("/api/auth/me", headers=headers)
    user_data = res.json()
    assert user_data["subscription_tier"] == "premium"
    assert user_data["subscription_expires_at"] is not None

@pytest.mark.asyncio
async def test_payment_invalid_tier(client: AsyncClient):
    # Register & Login
    reg_data = {"name": "Buyer2", "email": "buyer2@example.com", "password": "password"}
    await client.post("/api/auth/register", json=reg_data)
    res = await client.post("/api/auth/login", json={"email": "buyer2@example.com", "password": "password"})
    token = res.json()["access_token"]
    
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
    assert "Invalid subscription tier" in response.text

@pytest.mark.asyncio
async def test_mpesa_callback_stub(client: AsyncClient):
    # Test that the callback endpoint exists and returns accepted
    # even though it's currently a stub
    response = await client.post("/api/pay/mpesa/callback", json={"Body": "test"})
    assert response.status_code == 200
    assert response.json()["ResultCode"] == 0
