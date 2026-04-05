"""
Comprehensive feature verification test suite.
Tests all features from the implementation plan against the real MySQL backend.
"""
import asyncio
import sys
import os

# Load env
from dotenv import load_dotenv
load_dotenv()

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime, timedelta, UTC
import json

print("=" * 60)
print("  TAMBUATIPS — FEATURE VERIFICATION TEST SUITE")
print("  Database: MySQL (production)")
print("=" * 60)


async def run_all_tests():
    from app.main import app
    from app.database import engine, AsyncSessionLocal
    from app.dependencies import get_db, get_current_user, get_current_user_optional, require_admin
    from app.models.user import User
    from app.models.setting import AdminSetting
    from app.models.jackpot import Jackpot, JackpotPurchase
    from app.models.tip import Tip

    # ── Create a test user (we'll clean up after) ──
    TEST_EMAIL_ADMIN = "test_admin_verify@tambuatips.com"
    TEST_EMAIL_FREE = "test_free_verify@tambuatips.com"
    test_ids = []

    async with AsyncSessionLocal() as db:
        # Clean up any leftover test data from prior runs
        from app.models.payment import Payment
        for email in [TEST_EMAIL_ADMIN, TEST_EMAIL_FREE]:
            result = await db.execute(select(User).where(User.email == email))
            u = result.scalar_one_or_none()
            if u:
                # Delete related payments first (FK constraint)
                await db.execute(delete(Payment).where(Payment.user_id == u.id))
                await db.execute(delete(JackpotPurchase).where(JackpotPurchase.user_id == u.id))
                await db.flush()
                await db.delete(u)
        await db.commit()

        # Create fresh test users
        admin = User(
            name="TestAdmin",
            email=TEST_EMAIL_ADMIN,
            password="hashed_test_password",
            subscription_tier="premium",
            subscription_expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(days=365),
            is_admin=True,
        )
        db.add(admin)
        free_user = User(
            name="FreeUser",
            email=TEST_EMAIL_FREE,
            password="hashed_test_password",
            subscription_tier="free",
        )
        db.add(free_user)
        await db.commit()
        await db.refresh(admin)
        await db.refresh(free_user)
        admin_id = admin.id
        free_user_id = free_user.id
        test_ids.extend([admin_id, free_user_id])

    # ── Override auth dependencies ──
    async def override_admin():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == admin_id))
            return result.scalar_one()

    async def override_free_user():
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == free_user_id))
            return result.scalar_one()

    app.dependency_overrides[require_admin] = override_admin
    app.dependency_overrides[get_current_user] = override_admin
    app.dependency_overrides[get_current_user_optional] = override_admin

    passed = 0
    failed = 0
    errors = []
    created_tip_ids = []
    created_jackpot_ids = []

    def check(name, condition, detail=""):
        nonlocal passed, failed
        if condition:
            passed += 1
            print(f"  ✅ {name}")
        else:
            failed += 1
            errors.append(f"{name}: {detail}")
            print(f"  ❌ {name} — {detail}")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:

        # ══════════════════════════════════════════════════════════
        print("\n─── 1. BUG FIXES ───────────────────────────────────")
        # ══════════════════════════════════════════════════════════

        # 1a. Reset All Stats — should not crash with NULL
        r = await client.delete("/api/admin/dashboard/clear")
        check("Reset All Stats (no NULL crash)", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

        # Verify test users still have tier='free' after reset
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == free_user_id))
            u = result.scalar_one()
            check("Reset sets tier='free' (not NULL)", u.subscription_tier == "free", f"got {u.subscription_tier}")

        # 1b. Create a VIP tip, mark won, verify locked response hides prediction
        tip_payload = {
            "fixture_id": 999999,
            "home_team": "TestTeamA",
            "away_team": "TestTeamB",
            "league": "Test League",
            "match_date": datetime.now(UTC).isoformat(),
            "prediction": "TestTeamA Win",
            "odds": "1.85",
            "bookmaker": "Bet365",
            "confidence": 85,
            "reasoning": "Test reasoning",
            "category": "vip",
        }
        r = await client.post("/api/tips", json=tip_payload)
        check("Create VIP tip", r.status_code in (200, 201), f"status={r.status_code} body={r.text[:200]}")
        if r.status_code in (200, 201):
            tip_id = r.json()["id"]
            created_tip_ids.append(tip_id)

            # Mark it as won
            r2 = await client.put(f"/api/tips/{tip_id}", json={"result": "won"})
            check("Mark tip as won", r2.status_code == 200, f"status={r2.status_code}")

            # Check as free user
            app.dependency_overrides[get_current_user_optional] = override_free_user
            app.dependency_overrides[get_current_user] = override_free_user

            r3 = await client.get("/api/tips")
            tips_data = r3.json()
            vip_tips = [t for t in tips_data if t.get("id") == tip_id]
            if vip_tips:
                t = vip_tips[0]
                has_result = t.get("result") is not None
                is_locked = t.get("locked") == True
                check("Locked tip shows result field", has_result, f"result={t.get('result')}")
                check("Locked tip is locked (prediction hidden)", is_locked, f"locked={t.get('locked')}, prediction={t.get('prediction')}")
            else:
                check("VIP tip visible in list", False, "Tip not found (may be filtered by date)")

            # Restore admin
            app.dependency_overrides[get_current_user] = override_admin
            app.dependency_overrides[get_current_user_optional] = override_admin

        # ══════════════════════════════════════════════════════════
        print("\n─── 2. ADMIN SETTINGS ──────────────────────────────")
        # ══════════════════════════════════════════════════════════

        r = await client.get("/api/admin/settings")
        check("GET /admin/settings", r.status_code == 200, f"status={r.status_code}")
        settings = r.json()

        check("Has jackpot_midweek_price", "jackpot_midweek_price" in settings)
        check("Has jackpot_mega_price", "jackpot_mega_price" in settings)
        check("Has jackpot_history_retention_days", "jackpot_history_retention_days" in settings)
        check("Has jackpot_bundle_discount", "jackpot_bundle_discount" in settings)

        # Update settings
        r = await client.put("/api/admin/settings", json={
            "jackpot_history_retention_days": 14,
            "jackpot_bundle_discount": 25,
        })
        check("PUT /admin/settings", r.status_code == 200, f"status={r.status_code}")

        # Verify persistence
        r = await client.get("/api/admin/settings")
        s = r.json()
        check("Retention days persisted (14)", s.get("jackpot_history_retention_days") == 14, f"got {s.get('jackpot_history_retention_days')}")
        check("Bundle discount persisted (25)", s.get("jackpot_bundle_discount") == 25, f"got {s.get('jackpot_bundle_discount')}")

        # ══════════════════════════════════════════════════════════
        print("\n─── 3. ADMIN USER MANAGEMENT ───────────────────────")
        # ══════════════════════════════════════════════════════════

        r = await client.get("/api/admin/users")
        check("GET /admin/users", r.status_code == 200)
        check("Users list has entries", len(r.json()) >= 2, f"count={len(r.json())}")

        # Grant subscription
        r = await client.put(f"/api/admin/users/{free_user_id}/grant-subscription", json={
            "tier": "standard",
            "duration_days": 30,
        })
        check("Grant subscription to free user", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == free_user_id))
            u = result.scalar_one()
            check("User tier updated to 'standard'", u.subscription_tier == "standard", f"got {u.subscription_tier}")
            check("User has valid expiry", u.subscription_expires_at is not None)

        # Revoke subscription
        r = await client.put(f"/api/admin/users/{free_user_id}/revoke")
        check("Revoke subscription", r.status_code == 200, f"status={r.status_code}")

        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == free_user_id))
            u = result.scalar_one()
            check("User tier reverted to 'free'", u.subscription_tier == "free", f"got {u.subscription_tier}")

        # ══════════════════════════════════════════════════════════
        print("\n─── 4. JACKPOT CRUD + COUNTRY DATA ─────────────────")
        # ══════════════════════════════════════════════════════════

        jp_payload = {
            "type": "midweek",
            "dc_level": 4,
            "price": 500,
            "matches": [
                {"homeTeam": "Arsenal", "awayTeam": "Chelsea", "country": "England", "countryFlag": "https://media.api-sports.io/flags/gb-eng.svg"},
                {"homeTeam": "Barcelona", "awayTeam": "Real Madrid", "country": "Spain", "countryFlag": "https://media.api-sports.io/flags/es.svg"},
                {"homeTeam": "Bayern", "awayTeam": "Dortmund", "country": "Germany", "countryFlag": "https://media.api-sports.io/flags/de.svg"},
            ],
            "variations": [["1", "X", "2"], ["X", "1", "1"]],
        }
        r = await client.post("/api/jackpots", json=jp_payload)
        check("Create jackpot with country data", r.status_code in (200, 201), f"status={r.status_code} body={r.text[:300]}")

        if r.status_code in (200, 201):
            jp = r.json()
            jp_id = jp["id"]
            created_jackpot_ids.append(jp_id)
            check("Jackpot match has country='England'", jp["matches"][0].get("country") == "England")
            check("Jackpot match has countryFlag SVG URL", "api-sports.io" in (jp["matches"][0].get("countryFlag") or ""))

            # Create second jackpot for bundle test
            jp2_payload = {
                "type": "mega", "dc_level": 5, "price": 1000,
                "matches": [{"homeTeam": "Liverpool", "awayTeam": "Man City"}],
                "variations": [["1"]],
            }
            r = await client.post("/api/jackpots", json=jp2_payload)
            check("Create second jackpot", r.status_code in (200, 201))
            if r.status_code in (200, 201):
                created_jackpot_ids.append(r.json()["id"])

            # List jackpots
            r = await client.get("/api/jackpots")
            check("List jackpots", r.status_code == 200 and len(r.json()) >= 2, f"count={len(r.json()) if r.status_code==200 else 'N/A'}")

            # Postponed result per-match
            updated_matches = jp["matches"].copy()
            updated_matches[0]["result"] = "postponed"
            r = await client.put(f"/api/jackpots/{jp_id}", json={"matches": updated_matches})
            check("Set match result to 'postponed'", r.status_code == 200)
            if r.status_code == 200:
                check("Match result saved as 'postponed'", r.json()["matches"][0].get("result") == "postponed")

            # Overall jackpot result
            r = await client.put(f"/api/jackpots/{jp_id}", json={"result": "won"})
            check("Set jackpot result to 'won'", r.status_code == 200)
            r = await client.put(f"/api/jackpots/{jp_id}", json={"result": "postponed"})
            check("Set jackpot result to 'postponed'", r.status_code == 200)

        # ══════════════════════════════════════════════════════════
        print("\n─── 5. JACKPOT BUNDLE INFO ─────────────────────────")
        # ══════════════════════════════════════════════════════════

        app.dependency_overrides[get_current_user_optional] = override_free_user
        r = await client.get("/api/jackpots/bundle-info")
        check("GET /jackpots/bundle-info", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            bundle = r.json()
            check("Bundle has locked_count", "locked_count" in bundle)
            check("Bundle has original_price", "original_price" in bundle)
            check("Bundle has discounted_price", "discounted_price" in bundle)
            check("Bundle has discount_pct", "discount_pct" in bundle)
            check("Bundle has currency fields", "currency" in bundle and "currency_symbol" in bundle)
            check("Bundle locked_count >= 2", bundle.get("locked_count", 0) >= 2, f"got {bundle.get('locked_count')}")
            if bundle.get("original_price", 0) > 0:
                check("Discounted < original (25% off)", bundle["discounted_price"] < bundle["original_price"],
                      f"disc={bundle['discounted_price']} orig={bundle['original_price']}")
        app.dependency_overrides[get_current_user_optional] = override_admin

        # ══════════════════════════════════════════════════════════
        print("\n─── 6. JACKPOT HISTORY RETENTION ────────────────────")
        # ══════════════════════════════════════════════════════════

        # Create an old jackpot directly in DB
        async with AsyncSessionLocal() as db:
            old_jp = Jackpot(
                type="midweek", dc_level=3, price=500, result="won",
                matches=[{"homeTeam": "OldA", "awayTeam": "OldB"}],
                variations=[["1"]],
                created_at=datetime.now(UTC).replace(tzinfo=None) - timedelta(days=30),
            )
            db.add(old_jp)
            await db.commit()
            await db.refresh(old_jp)
            old_jp_id = old_jp.id
            created_jackpot_ids.append(old_jp_id)

        # As free user, old jackpot should be filtered
        app.dependency_overrides[get_current_user_optional] = override_free_user
        r = await client.get("/api/jackpots")
        jps = r.json()
        old_found = any(j["id"] == old_jp_id for j in jps)
        check("Old jackpot (30d) filtered for free user", not old_found, f"found={old_found}")
        app.dependency_overrides[get_current_user_optional] = override_admin

        # As admin, should still see it
        r = await client.get("/api/jackpots")
        jps = r.json()
        old_found_admin = any(j["id"] == old_jp_id for j in jps)
        check("Old jackpot visible to admin", old_found_admin)

        # ══════════════════════════════════════════════════════════
        print("\n─── 7. FREE JACKPOT (price=0) ──────────────────────")
        # ══════════════════════════════════════════════════════════

        free_jp = {"type": "midweek", "dc_level": 3, "price": 0,
                   "matches": [{"homeTeam": "FreeA", "awayTeam": "FreeB"}],
                   "variations": [["1"]]}
        r = await client.post("/api/jackpots", json=free_jp)
        check("Create free jackpot (price=0)", r.status_code in (200, 201))
        if r.status_code in (200, 201):
            free_jp_id = r.json()["id"]
            created_jackpot_ids.append(free_jp_id)

            # As free user, should be unlocked
            app.dependency_overrides[get_current_user_optional] = override_free_user
            r = await client.get(f"/api/jackpots/{free_jp_id}")
            check("Free jackpot accessible", r.status_code == 200)
            if r.status_code == 200:
                fjp = r.json()
                check("Free jackpot is unlocked (has variations)", fjp.get("locked") != True and len(fjp.get("variations", [])) > 0,
                      f"locked={fjp.get('locked')} vars={len(fjp.get('variations', []))}")
            app.dependency_overrides[get_current_user_optional] = override_admin

        # ══════════════════════════════════════════════════════════
        print("\n─── 8. PAYMENT — JACKPOT BUNDLE TYPE ───────────────")
        # ══════════════════════════════════════════════════════════

        app.dependency_overrides[get_current_user] = override_free_user
        r = await client.post("/api/pay/mpesa", json={
            "item_type": "jackpot_bundle",
            "item_id": "bundle",
            "phone": "254712345678",
        })
        check("Bundle payment endpoint exists (not 404)", r.status_code != 404, f"status={r.status_code}")
        check("Bundle payload accepted (not 422)", r.status_code != 422, f"status={r.status_code}")
        # Note: M-Pesa sandbox may timeout/fail, but the endpoint should not crash with 500
        check("Bundle payment doesn't crash (not 500)", r.status_code != 500, f"status={r.status_code} body={r.text[:200]}")
        app.dependency_overrides[get_current_user] = override_admin

        # ══════════════════════════════════════════════════════════
        print("\n─── 9. BROADCAST TARGET AUDIENCES ──────────────────")
        # ══════════════════════════════════════════════════════════

        for tier in ["everyone", "subscribers", "free", "basic", "standard", "premium"]:
            r = await client.post("/api/admin/broadcast-push", json={
                "title": f"Test {tier}", "body": "test", "target_tier": tier,
            })
            check(f"Broadcast target='{tier}'", r.status_code == 200, f"status={r.status_code}")

        # ══════════════════════════════════════════════════════════
        print("\n─── 10. FIXTURES ENRICH ENDPOINT ───────────────────")
        # ══════════════════════════════════════════════════════════

        r = await client.post("/api/admin/fixtures/enrich", json={
            "matches": [
                {"homeTeam": "Arsenal", "awayTeam": "Chelsea"},
                {"homeTeam": "Man Utd", "awayTeam": "Liverpool"},
            ]
        })
        check("POST /admin/fixtures/enrich", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            enriched = r.json()
            check("Returns matches array", "matches" in enriched and len(enriched["matches"]) == 2)
            m0 = enriched["matches"][0]
            check("Enriched has homeTeam", m0.get("homeTeam") == "Arsenal")
            check("Enriched has country field", "country" in m0)
            check("Enriched has countryFlag field", "countryFlag" in m0)
            # If API-Football data is available, country should be populated
            if m0.get("country"):
                check("Country auto-filled from API", len(m0["country"]) > 0, f"country='{m0['country']}'")
            else:
                print("  ⚠️  Country not filled (API-Football data may not be cached for today)")

    # ══════════════════════════════════════════════════════════
    # CLEANUP
    # ══════════════════════════════════════════════════════════
    print("\n─── CLEANUP ────────────────────────────────────────")
    try:
        from app.models.payment import Payment
        async with AsyncSessionLocal() as db:
            # Delete test payments first (FK constraint with users)
            for uid in test_ids:
                await db.execute(delete(Payment).where(Payment.user_id == uid))
            # Delete test jackpot purchases
            await db.execute(delete(JackpotPurchase).where(JackpotPurchase.user_id.in_(test_ids)))
            # Delete test jackpots
            for jid in created_jackpot_ids:
                result = await db.execute(select(Jackpot).where(Jackpot.id == jid))
                jp = result.scalar_one_or_none()
                if jp:
                    await db.delete(jp)
            # Delete test tips
            for tid in created_tip_ids:
                result = await db.execute(select(Tip).where(Tip.id == tid))
                tip = result.scalar_one_or_none()
                if tip:
                    await db.delete(tip)
            # Delete test users
            for uid in test_ids:
                result = await db.execute(select(User).where(User.id == uid))
                u = result.scalar_one_or_none()
                if u:
                    await db.delete(u)
            await db.commit()
        print("  🧹 Test data cleaned up")
    except Exception as e:
        print(f"  ⚠️  Cleanup error (non-critical): {e}")

    # ══════════════════════════════════════════════════════════
    print("\n" + "=" * 60)
    print(f"  RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    if errors:
        print("\n❌ FAILURES:")
        for e in errors:
            print(f"  • {e}")
    else:
        print("\n🎉 ALL TESTS PASSED!")

    # Clear overrides
    app.dependency_overrides.clear()
    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
