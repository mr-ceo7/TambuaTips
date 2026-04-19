from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.subscription import SubscriptionEntitlement, SubscriptionTier
from app.models.tip import Tip
from app.models.user import User
from app.services.subscription_access import grant_subscription_entitlement, sync_user_subscription_summary


async def _login_helper(client: AsyncClient, email: str, name: str) -> str:
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {"email": email, "name": name, "picture": ""}
        res = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        return res.cookies.get("access_token")


@pytest.mark.asyncio
async def test_multiple_subscription_purchases_create_separate_entitlements(client: AsyncClient, db_session: AsyncSession):
    token = await _login_helper(client, "multi-tier@example.com", "Multi Tier")
    headers = {"Authorization": f"Bearer {token}"}

    user = (await db_session.execute(select(User).where(User.email == "multi-tier@example.com"))).scalar_one()
    user.country = "KE"
    await db_session.commit()

    with patch("app.routers.payments.settings.PAYMENTS_LIVE", False):
        basic_response = await client.post(
            "/api/pay/mpesa",
            json={"item_type": "subscription", "item_id": "basic", "duration_weeks": 2, "phone": "254700000000"},
            headers=headers,
        )
        assert basic_response.status_code == 200

        standard_response = await client.post(
            "/api/pay/mpesa",
            json={"item_type": "subscription", "item_id": "standard", "duration_weeks": 4, "phone": "254700000000"},
            headers=headers,
        )
        assert standard_response.status_code == 200

    me_res = await client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    payload = me_res.json()

    assert payload["subscription_tier"] == "standard"
    assert len(payload["subscription_entitlements"]) == 2
    assert {item["tier_id"] for item in payload["subscription_entitlements"]} == {"basic", "standard"}


@pytest.mark.asyncio
async def test_access_falls_back_to_lower_active_entitlement_after_higher_expires(client: AsyncClient, db_session: AsyncSession):
    now = datetime.now(UTC).replace(tzinfo=None)
    user = User(
        name="Tier Mix",
        email="tier-mix@example.com",
        password="hashed",
        is_active=True,
        subscription_tier="premium",
        subscription_expires_at=now + timedelta(days=1),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    grant_subscription_entitlement(user, tier_id="standard", duration_days=14, source="test", now=now)
    grant_subscription_entitlement(user, tier_id="premium", duration_days=1, source="test", now=now - timedelta(days=2))

    premium_entitlement = next(
        entitlement for entitlement in user.subscription_entitlement_rows if entitlement.tier_id == "premium"
    )
    premium_entitlement.expires_at = now - timedelta(hours=1)
    sync_user_subscription_summary(user, now=now)

    db_session.add(user)
    await db_session.commit()

    tip = Tip(
        fixture_id=1001,
        home_team="Home",
        away_team="Away",
        league="League",
        match_date=now + timedelta(days=1),
        prediction="BTTS",
        odds="1.80",
        bookmaker="Bookmaker",
        confidence=4,
        reasoning="Reasoning",
        category="gg",
        is_premium=1,
        result="pending",
    )
    db_session.add(tip)
    await db_session.commit()

    token = await _login_helper(client, "tier-mix@example.com", "Tier Mix")
    res = await client.get("/api/tips?category=gg", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    tips = res.json()
    assert len(tips) == 1
    assert tips[0]["prediction"] == "BTTS"

    refreshed_user = (await db_session.execute(select(User).where(User.id == user.id))).scalar_one()
    assert refreshed_user.subscription_tier == "standard"
    entitlements = (await db_session.execute(select(SubscriptionEntitlement).where(SubscriptionEntitlement.user_id == user.id))).scalars().all()
    assert len(entitlements) == 2
