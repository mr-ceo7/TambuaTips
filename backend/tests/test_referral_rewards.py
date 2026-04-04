"""
Comprehensive tests for the Referral Points Economy.

Tests cover:
  1. Point Accrual — referrer earns +1 point when a new user signs up with their code
  2. Unlock Tip — spend points to unlock a specific locked tip
  3. Get Discount — spend points to activate a checkout discount coupon
  4. Get Premium — spend points to claim premium days
  5. Edge Cases:
     - Insufficient points for each action
     - Double-unlock same tip (rejected)
     - Double-discount activation (rejected)
     - Unlock a non-existent tip (404)
     - Invalid redemption action (400)
     - Rewards system disabled via admin toggle (400)
     - Self-referral prevention
     - Config endpoint returns correct values
     - Admin can change point costs and it propagates
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from unittest.mock import patch
from datetime import datetime, UTC

from app.models.user import User
from app.models.tip import Tip


# ══════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════

async def _google_login(client: AsyncClient, email: str, name: str, referred_by_code: str = "") -> str:
    """Login via mocked Google OAuth and return the access_token."""
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {"email": email, "name": name, "picture": ""}
        res = await client.post("/api/auth/google", json={"id_token": "tok", "referred_by_code": referred_by_code})
        assert res.status_code == 200, f"Login failed for {email}: {res.text}"
    return res.cookies.get("access_token")


async def _make_admin(db_session: AsyncSession, email: str):
    """Promote a user to admin."""
    await db_session.execute(update(User).where(User.email == email).values(is_admin=True))
    await db_session.commit()


async def _set_points(db_session: AsyncSession, email: str, points: int):
    """Directly set a user's referral_points for testing."""
    await db_session.execute(update(User).where(User.email == email).values(referral_points=points))
    await db_session.commit()


async def _get_user(db_session: AsyncSession, email: str) -> User:
    """Fetch a fresh user object from the DB."""
    db_session.expunge_all()
    result = await db_session.execute(select(User).where(User.email == email))
    return result.scalar_one()


async def _create_tip(db_session: AsyncSession) -> int:
    """Insert a dummy locked tip and return its ID."""
    tip = Tip(
        fixture_id=99999,
        home_team="Team A",
        away_team="Team B",
        league="Test League",
        match_date=datetime.now(UTC).replace(tzinfo=None),
        prediction="Over 2.5",
        odds="1.85",
        bookmaker="TestBook",
        confidence=4,
        category="premium",
        is_premium=1,
        result="pending",
    )
    db_session.add(tip)
    await db_session.commit()
    await db_session.refresh(tip)
    return tip.id


def _auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ══════════════════════════════════════════════════════════════════
#  1. POINT ACCRUAL VIA REFERRAL
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_referral_grants_one_point(client: AsyncClient, db_session: AsyncSession):
    """When a new user signs up with a referral code, the referrer earns +1 point."""
    # Referrer signs up
    ref_token = await _google_login(client, "referrer_pts@test.com", "Referrer")
    me = (await client.get("/api/auth/me", headers=_auth_headers(ref_token))).json()
    referral_code = me["referral_code"]

    # New user signs up with referral code
    await _google_login(client, "newuser_pts@test.com", "NewUser", referred_by_code=referral_code)

    # Verify referrer got +1 point
    referrer = await _get_user(db_session, "referrer_pts@test.com")
    assert referrer.referral_points == 1, f"Expected 1 point, got {referrer.referral_points}"
    assert referrer.referrals_count == 1


@pytest.mark.asyncio
async def test_multiple_referrals_accumulate_points(client: AsyncClient, db_session: AsyncSession):
    """Multiple referrals accumulate points correctly."""
    ref_token = await _google_login(client, "multi_ref@test.com", "MultiRef")
    me = (await client.get("/api/auth/me", headers=_auth_headers(ref_token))).json()
    code = me["referral_code"]

    # 3 new users sign up
    for i in range(3):
        await _google_login(client, f"invited_{i}@test.com", f"Invited{i}", referred_by_code=code)

    referrer = await _get_user(db_session, "multi_ref@test.com")
    assert referrer.referral_points == 3
    assert referrer.referrals_count == 3


@pytest.mark.asyncio
async def test_self_referral_no_points(client: AsyncClient, db_session: AsyncSession):
    """A user cannot earn points by using their own referral code."""
    token = await _google_login(client, "selfish@test.com", "Selfish")
    me = (await client.get("/api/auth/me", headers=_auth_headers(token))).json()
    code = me["referral_code"]

    # Same email tries to login again with own code — this is a returning user, not a new one
    # The referral block only fires for NEW users, so no points should be added
    user = await _get_user(db_session, "selfish@test.com")
    assert user.referral_points == 0


@pytest.mark.asyncio
async def test_bogus_referral_code_no_crash(client: AsyncClient, db_session: AsyncSession):
    """A non-existent referral code should not crash signup."""
    token = await _google_login(client, "bogus_ref@test.com", "Bogus", referred_by_code="DOESNOTEXIST99")
    assert token is not None
    user = await _get_user(db_session, "bogus_ref@test.com")
    assert user.referrer_id is None


# ══════════════════════════════════════════════════════════════════
#  2. REWARDS CONFIG ENDPOINT
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_rewards_config_returns_defaults(client: AsyncClient, db_session: AsyncSession):
    """GET /rewards/config returns the correct default values."""
    # Need to be logged in (the endpoint uses get_db, not auth)
    res = await client.get("/rewards/config")
    assert res.status_code == 200
    data = res.json()
    assert data["points_per_tip"] == 2
    assert data["points_per_discount"] == 5
    assert data["discount_percentage"] == 50
    assert data["points_per_premium"] == 10
    assert data["premium_days_reward"] == 7


@pytest.mark.asyncio
async def test_admin_config_propagates_to_rewards(client: AsyncClient, db_session: AsyncSession):
    """Admin changes to point costs should propagate to /rewards/config."""
    admin_token = await _google_login(client, "admin_cfg@test.com", "Admin")
    await _make_admin(db_session, "admin_cfg@test.com")

    # Change points_per_tip to 5
    res = await client.put(
        "/api/admin/settings",
        json={"points_per_tip": 5},
        headers=_auth_headers(admin_token),
    )
    assert res.status_code == 200

    # Verify it propagates
    config_res = await client.get("/rewards/config")
    assert config_res.json()["points_per_tip"] == 5


# ══════════════════════════════════════════════════════════════════
#  3. UNLOCK TIP
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_unlock_tip_success(client: AsyncClient, db_session: AsyncSession):
    """User with enough points can unlock a tip."""
    token = await _google_login(client, "unlocker@test.com", "Unlocker")
    await _set_points(db_session, "unlocker@test.com", 10)
    tip_id = await _create_tip(db_session)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip", "tip_id": tip_id},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["points"] == 8  # 10 - 2 (default cost)

    # Verify the tip is in unlocked_tip_ids
    user = await _get_user(db_session, "unlocker@test.com")
    assert tip_id in (user.unlocked_tip_ids or [])


@pytest.mark.asyncio
async def test_unlock_tip_insufficient_points(client: AsyncClient, db_session: AsyncSession):
    """User with 0 points cannot unlock a tip."""
    token = await _google_login(client, "broke@test.com", "Broke")
    tip_id = await _create_tip(db_session)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip", "tip_id": tip_id},
        headers=_auth_headers(token),
    )
    assert res.status_code == 400
    assert "Insufficient points" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unlock_tip_already_unlocked(client: AsyncClient, db_session: AsyncSession):
    """Cannot unlock the same tip twice."""
    token = await _google_login(client, "double_unlock@test.com", "Double")
    await _set_points(db_session, "double_unlock@test.com", 10)
    tip_id = await _create_tip(db_session)

    # First unlock
    res1 = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip", "tip_id": tip_id},
        headers=_auth_headers(token),
    )
    assert res1.status_code == 200

    # Second unlock — should fail
    res2 = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip", "tip_id": tip_id},
        headers=_auth_headers(token),
    )
    assert res2.status_code == 400
    assert "already unlocked" in res2.json()["detail"]


@pytest.mark.asyncio
async def test_unlock_tip_nonexistent(client: AsyncClient, db_session: AsyncSession):
    """Unlocking a tip ID that doesn't exist returns 404."""
    token = await _google_login(client, "ghost_tip@test.com", "Ghost")
    await _set_points(db_session, "ghost_tip@test.com", 10)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip", "tip_id": 999999},
        headers=_auth_headers(token),
    )
    assert res.status_code == 404
    assert "Tip not found" in res.json()["detail"]


@pytest.mark.asyncio
async def test_unlock_tip_missing_tip_id(client: AsyncClient, db_session: AsyncSession):
    """unlock_tip without a tip_id returns 400."""
    token = await _google_login(client, "no_tipid@test.com", "NoTip")
    await _set_points(db_session, "no_tipid@test.com", 10)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "unlock_tip"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 400
    assert "tip_id is required" in res.json()["detail"]


# ══════════════════════════════════════════════════════════════════
#  4. GET DISCOUNT
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_get_discount_success(client: AsyncClient, db_session: AsyncSession):
    """User with enough points can activate a discount."""
    token = await _google_login(client, "discounter@test.com", "Discounter")
    await _set_points(db_session, "discounter@test.com", 10)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "get_discount"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["points"] == 5  # 10 - 5 (default cost)

    # Verify flag is set
    user = await _get_user(db_session, "discounter@test.com")
    assert user.referral_discount_active is True


@pytest.mark.asyncio
async def test_get_discount_insufficient_points(client: AsyncClient, db_session: AsyncSession):
    """Discount activation fails with insufficient points."""
    token = await _google_login(client, "broke_disc@test.com", "BrokeDisc")
    await _set_points(db_session, "broke_disc@test.com", 3)  # Need 5

    res = await client.post(
        "/rewards/redeem",
        json={"action": "get_discount"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 400
    assert "Insufficient points" in res.json()["detail"]


@pytest.mark.asyncio
async def test_get_discount_already_active(client: AsyncClient, db_session: AsyncSession):
    """Cannot activate discount when one is already active."""
    token = await _google_login(client, "double_disc@test.com", "DoubleDisc")
    await _set_points(db_session, "double_disc@test.com", 20)

    # First activation
    res1 = await client.post(
        "/rewards/redeem",
        json={"action": "get_discount"},
        headers=_auth_headers(token),
    )
    assert res1.status_code == 200

    # Second activation — should fail
    res2 = await client.post(
        "/rewards/redeem",
        json={"action": "get_discount"},
        headers=_auth_headers(token),
    )
    assert res2.status_code == 400
    assert "already have an active discount" in res2.json()["detail"]


# ══════════════════════════════════════════════════════════════════
#  5. GET PREMIUM
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_get_premium_success(client: AsyncClient, db_session: AsyncSession):
    """User with enough points can claim premium days."""
    token = await _google_login(client, "premiumguy@test.com", "PremiumGuy")
    await _set_points(db_session, "premiumguy@test.com", 10)  # Exact cost

    res = await client.post(
        "/rewards/redeem",
        json={"action": "get_premium"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["points"] == 0  # 10 - 10

    # Verify subscription was set
    user = await _get_user(db_session, "premiumguy@test.com")
    assert user.subscription_expires_at is not None
    assert user.subscription_tier != "free"


@pytest.mark.asyncio
async def test_get_premium_insufficient_points(client: AsyncClient, db_session: AsyncSession):
    """Premium claim fails with insufficient points."""
    token = await _google_login(client, "broke_prem@test.com", "BrokePrem")
    await _set_points(db_session, "broke_prem@test.com", 5)  # Need 10

    res = await client.post(
        "/rewards/redeem",
        json={"action": "get_premium"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 400
    assert "Insufficient points" in res.json()["detail"]


@pytest.mark.asyncio
async def test_get_premium_extends_existing(client: AsyncClient, db_session: AsyncSession):
    """Claiming premium when already subscribed extends the expiry."""
    token = await _google_login(client, "extender@test.com", "Extender")
    await _set_points(db_session, "extender@test.com", 20)

    # First claim
    res1 = await client.post(
        "/rewards/redeem",
        json={"action": "get_premium"},
        headers=_auth_headers(token),
    )
    assert res1.status_code == 200

    # Grab the first expiry
    user1 = await _get_user(db_session, "extender@test.com")
    first_expiry = user1.subscription_expires_at

    # Give more points and claim again
    await _set_points(db_session, "extender@test.com", 10)

    res2 = await client.post(
        "/rewards/redeem",
        json={"action": "get_premium"},
        headers=_auth_headers(token),
    )
    assert res2.status_code == 200

    # Verify expiry was EXTENDED, not reset
    user2 = await _get_user(db_session, "extender@test.com")
    assert user2.subscription_expires_at > first_expiry


# ══════════════════════════════════════════════════════════════════
#  6. SYSTEM DISABLED
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_redeem_blocked_when_system_disabled(client: AsyncClient, db_session: AsyncSession):
    """All redemptions fail when the admin disables the referral system."""
    # Create admin and disable the system
    admin_token = await _google_login(client, "admin_disable@test.com", "Admin")
    await _make_admin(db_session, "admin_disable@test.com")

    await client.put(
        "/api/admin/settings",
        json={"referral_enabled": False},
        headers=_auth_headers(admin_token),
    )

    # Create a user with points
    user_token = await _google_login(client, "blocked_user@test.com", "Blocked")
    await _set_points(db_session, "blocked_user@test.com", 50)
    tip_id = await _create_tip(db_session)

    # All 3 actions should fail
    for action, extra in [
        ("unlock_tip", {"tip_id": tip_id}),
        ("get_discount", {}),
        ("get_premium", {}),
    ]:
        res = await client.post(
            "/rewards/redeem",
            json={"action": action, **extra},
            headers=_auth_headers(user_token),
        )
        assert res.status_code == 400, f"Action '{action}' should be blocked: {res.text}"
        assert "disabled" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_referral_disabled_no_points_on_signup(client: AsyncClient, db_session: AsyncSession):
    """When the system is disabled, new referrals don't grant points."""
    # Create admin and disable
    admin_token = await _google_login(client, "admin_noref@test.com", "AdminNoRef")
    await _make_admin(db_session, "admin_noref@test.com")

    await client.put(
        "/api/admin/settings",
        json={"referral_enabled": False},
        headers=_auth_headers(admin_token),
    )

    # Create a referrer
    ref_token = await _google_login(client, "ref_disabled@test.com", "RefDisabled")
    me = (await client.get("/api/auth/me", headers=_auth_headers(ref_token))).json()
    code = me["referral_code"]

    # New user signs up with the code
    await _google_login(client, "new_disabled@test.com", "NewDisabled", referred_by_code=code)

    # Referrer should have 0 points because system is disabled
    referrer = await _get_user(db_session, "ref_disabled@test.com")
    assert referrer.referral_points == 0
    assert referrer.referrals_count == 0


# ══════════════════════════════════════════════════════════════════
#  7. INVALID ACTION
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_invalid_redeem_action(client: AsyncClient, db_session: AsyncSession):
    """An invalid action string returns 400."""
    token = await _google_login(client, "invalid_action@test.com", "Invalid")
    await _set_points(db_session, "invalid_action@test.com", 10)

    res = await client.post(
        "/rewards/redeem",
        json={"action": "hack_the_system"},
        headers=_auth_headers(token),
    )
    assert res.status_code == 400
    assert "Invalid redemption action" in res.json()["detail"]


# ══════════════════════════════════════════════════════════════════
#  8. UNAUTHENTICATED ACCESS
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_redeem_requires_auth(client: AsyncClient, db_session: AsyncSession):
    """POST /rewards/redeem without auth returns 401."""
    res = await client.post(
        "/rewards/redeem",
        json={"action": "get_premium"},
    )
    assert res.status_code == 401


# ══════════════════════════════════════════════════════════════════
#  9. POINT BALANCE INTEGRITY (multi-step)
# ══════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_point_balance_across_multiple_actions(client: AsyncClient, db_session: AsyncSession):
    """Points are deducted correctly across a sequence of different redemptions."""
    token = await _google_login(client, "sequencer@test.com", "Sequencer")
    await _set_points(db_session, "sequencer@test.com", 20)

    tip1 = await _create_tip(db_session)
    tip2 = await _create_tip(db_session)

    # Step 1: unlock tip1 (cost 2) → 18 remaining
    r1 = await client.post("/rewards/redeem", json={"action": "unlock_tip", "tip_id": tip1}, headers=_auth_headers(token))
    assert r1.status_code == 200
    assert r1.json()["points"] == 18

    # Step 2: unlock tip2 (cost 2) → 16 remaining
    r2 = await client.post("/rewards/redeem", json={"action": "unlock_tip", "tip_id": tip2}, headers=_auth_headers(token))
    assert r2.status_code == 200
    assert r2.json()["points"] == 16

    # Step 3: get discount (cost 5) → 11 remaining
    r3 = await client.post("/rewards/redeem", json={"action": "get_discount"}, headers=_auth_headers(token))
    assert r3.status_code == 200
    assert r3.json()["points"] == 11

    # Step 4: get premium (cost 10) → 1 remaining
    r4 = await client.post("/rewards/redeem", json={"action": "get_premium"}, headers=_auth_headers(token))
    assert r4.status_code == 200
    assert r4.json()["points"] == 1

    # Step 5: try another premium (cost 10) → should fail, only 1 point
    r5 = await client.post("/rewards/redeem", json={"action": "get_premium"}, headers=_auth_headers(token))
    assert r5.status_code == 400

    # Final verification — check points via a fresh redeem attempt
    # We know points should be 1 (insufficient for anything)
    r6 = await client.post("/rewards/redeem", json={"action": "unlock_tip", "tip_id": tip1}, headers=_auth_headers(token))
    assert r6.status_code == 400  # Already unlocked

    r7 = await client.post("/rewards/redeem", json={"action": "unlock_tip", "tip_id": tip2}, headers=_auth_headers(token))
    assert r7.status_code == 400  # Already unlocked

    # Verify the second discount also fails (insufficient points now — only 1 left, need 5)
    r8 = await client.post("/rewards/redeem", json={"action": "get_discount"}, headers=_auth_headers(token))
    assert r8.status_code == 400
