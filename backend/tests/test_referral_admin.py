import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from unittest.mock import patch

from app.models.user import User

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
async def test_admin_settings_lifecycle(client: AsyncClient, db_session: AsyncSession):
    # 1. Login as Admin
    admin_token = await _login_helper_with_tier(client, db_session, "admin@example.com", "Admin", admin=True)
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Get settings
    get_res = await client.get("/api/admin/settings", headers=headers)
    assert get_res.status_code == 200
    settings = get_res.json()
    assert "referral_enabled" in settings
    
    # 3. Update settings
    put_res = await client.put("/api/admin/settings", json={"referral_enabled": False, "referral_reward_days": 14}, headers=headers)
    assert put_res.status_code == 200
    new_settings = put_res.json()
    assert new_settings["referral_enabled"] == False
    assert new_settings["referral_reward_days"] == 14

@pytest.mark.asyncio
async def test_admin_gating(client: AsyncClient, db_session: AsyncSession):
    # Standard user attempting to access admin settings
    token = await _login_helper_with_tier(client, db_session, "user@example.com", "User", admin=False)
    headers = {"Authorization": f"Bearer {token}"}
    
    get_res = await client.get("/api/admin/settings", headers=headers)
    assert get_res.status_code in [403, 401]
    
    put_res = await client.put("/api/admin/settings", json={"referral_enabled": False}, headers=headers)
    assert put_res.status_code in [403, 401]

@pytest.mark.asyncio
async def test_enforcing_master_override(client: AsyncClient, db_session: AsyncSession):
    # 1. Turn OFF referral feature as Admin
    admin_token = await _login_helper_with_tier(client, db_session, "admin@example.com", "Admin", admin=True)
    headers = {"Authorization": f"Bearer {admin_token}"}
    await client.put("/api/admin/settings", json={"referral_enabled": False}, headers=headers)
    
    # 2. Register Referrer
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {"email": "referrer@example.com", "name": "Referrer", "picture": ""}
        res1 = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": ""})
        ref_token = res1.cookies.get("access_token")
        
    mem_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {ref_token}"})
    referrer_code = mem_res.json()["referral_code"]
    
    # 3. Register New User with the Referrer Code
    with patch("google.oauth2.id_token.verify_oauth2_token") as mock_verify:
        mock_verify.return_value = {"email": "referred@example.com", "name": "Referred", "picture": ""}
        res2 = await client.post("/api/auth/google", json={"id_token": "token", "referred_by_code": referrer_code})
        assert res2.status_code == 200

    # 4. Assert referrers count didn't change because the feature is globally disabled
    mem_res_after = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {ref_token}"})
    # Count should NOT be incremented
    assert mem_res_after.json()["referrals_count"] == 0
    # Tier should NOT be upgraded
    assert mem_res_after.json()["subscription_tier"] == "free"
