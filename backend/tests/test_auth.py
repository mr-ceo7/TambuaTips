import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_auth_register_and_login(client: AsyncClient):
    # 1. Register User
    reg_data = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "password123"
    }
    response = await client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 201, response.text
    
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # 2. Duplicate Registration should fail with 409
    response = await client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 409, "Duplicate email should return 409"
    assert "already registered" in response.text.lower()

    # 3. Login User
    login_data = {
        "email": "testuser@example.com",
        "password": "password123"
    }
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 200
    
    tokens = response.json()
    access_token = tokens["access_token"]
    
    # 4. Get Current User (Me)
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    assert response.status_code == 200
    user = response.json()
    assert user["email"] == "testuser@example.com"
    assert user["subscription_tier"] == "free"

@pytest.mark.asyncio
async def test_auth_invalid_login(client: AsyncClient):
    login_data = {
        "email": "wronguser@example.com",
        "password": "wrongpassword"
    }
    response = await client.post("/api/auth/login", json=login_data)
    assert response.status_code == 401
    assert "Invalid email or password" in response.text

@pytest.mark.asyncio
async def test_auth_invalid_token(client: AsyncClient):
    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid.token.string"}
    )
    assert response.status_code == 401
    assert "Invalid or expired token" in response.text
