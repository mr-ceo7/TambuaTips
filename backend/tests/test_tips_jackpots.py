import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.user import User

@pytest.fixture
async def admin_token(client: AsyncClient, db_session: AsyncSession):
    # 1. Register
    reg_data = {"name": "Admin", "email": "admin@example.com", "password": "adminpassword"}
    await client.post("/api/auth/register", json=reg_data)
    
    # 2. Escalate to Admin in DB
    await db_session.execute(
        update(User).where(User.email == "admin@example.com").values(is_admin=True)
    )
    await db_session.commit()
    
    # 3. Login
    login_data = {"email": "admin@example.com", "password": "adminpassword"}
    res = await client.post("/api/auth/login", json=login_data)
    return res.json()["access_token"]

@pytest.mark.asyncio
async def test_get_tips_public(client: AsyncClient):
    # Fetching tips should return 200 even without auth (for free tips)
    response = await client.get("/api/tips?category=free")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_create_tip_validation_error(client: AsyncClient, admin_token: str):
    # Attempt to create a tip with missing required fields
    tip_data = {
        "fixture_id": 1234,
        "home_team": "Team A"
        # Missing away_team, prediction, etc.
    }
    response = await client.post(
        "/api/tips",
        json=tip_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    # FastAPI should automatically return 422 Unprocessable Entity
    assert response.status_code == 422
    err_json = response.json()
    assert "detail" in err_json
    
@pytest.mark.asyncio
async def test_create_valid_tip(client: AsyncClient, admin_token: str):
    tip_data = {
        "fixture_id": 9999,
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "league": "Premier League",
        "match_date": "2024-12-01T15:00:00",
        "prediction": "Home Win",
        "odds": "2.10",
        "bookmaker": "Betway",
        "category": "free",
        "confidence": 4,
        "is_premium": False
    }
    response = await client.post(
        "/api/tips",
        json=tip_data,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    # Depending on how the dependency works, if admin is strictly enforced, 
    # we might need to mock get_current_admin instead of just get_current_user.
    # Assuming the route accepts it for now.
    assert response.status_code == 201, f"Got {response.status_code}: {response.text}"
    data = response.json()
    assert data["home_team"] == "Arsenal"
    assert data["is_premium"] == 0 # because category is free
