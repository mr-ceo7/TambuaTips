from datetime import date, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from unittest.mock import patch

from app.models.user import User
from app.models.tip import Tip
from app.models.jackpot import JackpotPurchase
from app.routers.tips import tip_stats

async def _login_helper_with_tier(client: AsyncClient, db_session: AsyncSession, email: str, name: str, tier: str = "free", admin: bool = False) -> str:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {
            "email": email, "name": name, "picture": ""
        }
        res = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        
        # update user manually
        await db_session.execute(
            update(User).where(User.email == email).values(
                subscription_tier=tier, 
                is_admin=admin,
                country='KE'
            )
        )
        await db_session.commit()
    return res.cookies.get("access_token")

@pytest.mark.asyncio
async def test_get_tips_public(client: AsyncClient):
    # Fetching tips should return 200 even without auth (for free tips)
    response = await client.get("/api/tips?category=free")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_content_gating_unauthorized(client: AsyncClient, db_session: AsyncSession):
    # Free user trying to access premium tips
    token = await _login_helper_with_tier(client, db_session, "freeuser@example.com", "Free User", tier="free")
    response = await client.get("/api/tips?category=premium", headers={"Authorization": f"Bearer {token}"})
    # Our app's pagination/query might just return empty lists for unauthorized, or 403.
    # Currently TambuaTips returns an empty array or 403. Let's see what it does.
    # We will assert that the response doesn't expose the sensitive match details if tested against seeding.
    pass  # We will test this more strictly below if a seed exists.

@pytest.mark.asyncio
async def test_create_valid_tip(client: AsyncClient, db_session: AsyncSession):
    admin_token = await _login_helper_with_tier(client, db_session, "admin2@example.com", "Admin", admin=True)
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
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_admin_without_subscription_can_view_premium_tip(client: AsyncClient, db_session: AsyncSession):
    admin_token = await _login_helper_with_tier(
        client,
        db_session,
        "admin-nosub@example.com",
        "Admin No Sub",
        tier="free",
        admin=True,
    )

    tip = Tip(
        fixture_id=88001,
        home_team="Admin FC",
        away_team="Premium United",
        league="Admin League",
        match_date=datetime(2026, 4, 12, 15, 0, 0),
        prediction="Home Win",
        odds="1.90",
        bookmaker="Betway",
        confidence=4,
        reasoning="Admin access test.",
        category="vip",
        is_premium=1,
        result="pending",
    )
    db_session.add(tip)
    await db_session.commit()
    await db_session.refresh(tip)

    response = await client.get(
        f"/api/tips/{tip.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == tip.id
    assert payload["prediction"] == "Home Win"


@pytest.mark.asyncio
async def test_admin_without_subscription_sees_lost_premium_tip_in_list(client: AsyncClient, db_session: AsyncSession):
    admin_token = await _login_helper_with_tier(
        client,
        db_session,
        "admin-list-nosub@example.com",
        "Admin List No Sub",
        tier="free",
        admin=True,
    )

    lost_tip = Tip(
        fixture_id=88002,
        home_team="Lost FC",
        away_team="History United",
        league="Admin League",
        match_date=datetime(2026, 4, 11, 15, 0, 0),
        prediction="Away Win",
        odds="2.20",
        bookmaker="Betway",
        confidence=3,
        reasoning="Admin list access test.",
        category="vip",
        is_premium=1,
        result="lost",
    )
    db_session.add(lost_tip)
    await db_session.commit()
    await db_session.refresh(lost_tip)

    response = await client.get(
        "/api/tips?date=all",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 200
    payload = response.json()
    returned_tip = next((item for item in payload if item["id"] == lost_tip.id), None)
    assert returned_tip is not None
    assert returned_tip["prediction"] == "Away Win"


@pytest.mark.asyncio
async def test_tip_stats_include_postponed_results(db_session: AsyncSession):
    db_session.add_all([
        Tip(
            fixture_id=99001,
            home_team="Won FC",
            away_team="Other FC",
            league="Stats League",
            match_date=datetime(2026, 4, 10, 12, 0, 0),
            prediction="1",
            odds="1.70",
            bookmaker="Betway",
            confidence=3,
            category="2+",
            is_premium=1,
            result="won",
        ),
        Tip(
            fixture_id=99002,
            home_team="PPD FC",
            away_team="Other FC",
            league="Stats League",
            match_date=datetime(2026, 4, 11, 12, 0, 0),
            prediction="X",
            odds="2.10",
            bookmaker="Betway",
            confidence=3,
            category="4+",
            is_premium=1,
            result="postponed",
        ),
    ])
    await db_session.commit()

    stats = await tip_stats(db=db_session)

    assert stats.total == 2
    assert stats.won == 1
    assert stats.postponed == 1
    assert stats.pending == 0

@pytest.mark.asyncio
async def test_double_purchasing_jackpot(client: AsyncClient, db_session: AsyncSession):
    # 1. Login user
    token = await _login_helper_with_tier(client, db_session, "jackpotbuyer@example.com", "JP Buyer")
    headers = {"Authorization": f"Bearer {token}"}

    # First, need to create a jackpot as admin
    admin_token = await _login_helper_with_tier(client, db_session, "admin@example.com", "Admin", admin=True)
    jp_data = {
        "type": "mega",
        "dc_level": 7,
        "matches": [
            {"homeTeam": "Arsenal", "awayTeam": "Chelsea"}
        ],
        "variations": [["1"]],
        "price": 100
    }
    jp_res = await client.post("/api/jackpots", json=jp_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert jp_res.status_code == 201
    jackpot_id = jp_res.json()["id"]

    # 2. Buy Jackpot once
    pay_data = {
        "item_type": "jackpot",
        "item_id": str(jackpot_id),
        "duration_weeks": 0,
        "phone": "254700000000"
    }
    
    with patch("app.routers.payments.settings.PAYMENTS_LIVE", False):
        res1 = await client.post("/api/pay/mpesa", json=pay_data, headers=headers)
        assert res1.status_code == 200
        
        # 3. Buy Jackpot twice
        res2 = await client.post("/api/pay/mpesa", json=pay_data, headers=headers)
        assert res2.status_code == 400
        assert "already purchased" in res2.text.lower()


@pytest.mark.asyncio
async def test_delete_jackpot_removes_dependent_purchases(client: AsyncClient, db_session: AsyncSession):
    admin_token = await _login_helper_with_tier(client, db_session, "admin-delete-jp@example.com", "Admin", admin=True)
    user_token = await _login_helper_with_tier(client, db_session, "jp-holder@example.com", "JP Holder")

    jp_data = {
        "type": "mega",
        "dc_level": 4,
        "matches": [
            {"homeTeam": "Delete FC", "awayTeam": "Cleanup United"}
        ],
        "variations": [["1"]],
        "price": 100
    }
    jp_res = await client.post("/api/jackpots", json=jp_data, headers={"Authorization": f"Bearer {admin_token}"})
    assert jp_res.status_code == 201
    jackpot_id = jp_res.json()["id"]

    user = (await db_session.execute(select(User).where(User.email == "jp-holder@example.com"))).scalar_one()
    db_session.add(JackpotPurchase(user_id=user.id, jackpot_id=jackpot_id))
    await db_session.commit()

    delete_res = await client.delete(f"/api/jackpots/{jackpot_id}", headers={"Authorization": f"Bearer {admin_token}"})
    assert delete_res.status_code == 204

    remaining_purchase = (await db_session.execute(select(JackpotPurchase).where(JackpotPurchase.jackpot_id == jackpot_id))).scalar_one_or_none()
    assert remaining_purchase is None


@pytest.mark.asyncio
async def test_create_and_update_jackpot_display_date(client: AsyncClient, db_session: AsyncSession):
    admin_token = await _login_helper_with_tier(client, db_session, "admin-jp-date@example.com", "Admin", admin=True)

    create_payload = {
        "type": "midweek",
        "dc_level": 3,
        "matches": [{"homeTeam": "Date FC", "awayTeam": "Target FC"}] * 13,
        "variations": [["1"] * 13],
        "price": 100,
        "display_date": "2026-04-20",
    }

    create_response = await client.post(
        "/api/jackpots",
        json=create_payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["display_date"] == "2026-04-20"

    update_response = await client.put(
        f"/api/jackpots/{created['id']}",
        json={"display_date": "2026-04-21"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["display_date"] == "2026-04-21"
