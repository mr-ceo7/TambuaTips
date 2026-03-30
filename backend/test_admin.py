import asyncio
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.activity import UserActivity
from app.security import hash_password, create_access_token

async def run_test():
    print("Setting up test accounts via DB...")
    async with AsyncSessionLocal() as db:
        # Create or get an admin
        result = await db.execute(select(User).where(User.email == "admin_test@tambua.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(name="Test Admin", email="admin_test@tambua.com", password=hash_password("password123"), is_admin=True)
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            
        admin_token = create_access_token(str(admin.id))
        print(f"[OK] Admin account active, ID: {admin.id}")

        # Create or get a normal user
        result = await db.execute(select(User).where(User.email == "user_test@tambua.com"))
        target = result.scalar_one_or_none()
        if not target:
            target = User(name="Test User", email="user_test@tambua.com", password=hash_password("password123"), is_admin=False)
            db.add(target)
            await db.commit()
            await db.refresh(target)
            
        # Ensure user is active before testing
        target.is_active = True
        await db.commit()
        
        target_token = create_access_token(str(target.id))
        target_id = target.id
        print(f"[OK] Standard user active, ID: {target.id}")

    # 1. Telemetry Test
    print("\n[Test 1] Simulating frontend telemetry ping...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        res = await client.post("/api/auth/activity", 
            json={"path": "/jackpot", "time_spent": 120},
            headers={"Authorization": f"Bearer {target_token}"}
        )
        if res.status_code == 200:
            print("  --> SUCCESS: User successfully tracked 120 seconds on /jackpot path")
        else:
            print(f"  --> FAILED: Response {res.status_code} {res.text}")

    # 2. Admin Analytics Aggregation Test
    print("\n[Test 2] Querying Admin Analytics Dashboard Data...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
        if res.status_code == 200:
            users = res.json()
            test_usr = next((u for u in users if u["id"] == target_id), None)
            if test_usr:
                print(f"  --> SUCCESS: Target user metrics found in Admin aggregation.")
                print(f"      - Is Online: {test_usr.get('is_online')}")
                print(f"      - Last Seen: {test_usr.get('last_seen')}")
                print(f"      - Most Visited Page: {test_usr.get('most_visited_page')}")
                print(f"      - Total App Time: {test_usr.get('total_time_spent')} sec")
            else:
                print("  --> FAILED: Cannot find test user in Admin list.")
        else:
            print(f"  --> FAILED: GET /users responded {res.status_code} {res.text}")

    # 3. Toggle Ban Test
    print("\n[Test 3] Executing Admin Ban Action (is_active toggle)...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        res = await client.put(f"/api/admin/users/{target_id}/toggle-active", headers={"Authorization": f"Bearer {admin_token}"})
        if res.status_code == 200:
            active_state = res.json().get("is_active")
            print(f"  --> SUCCESS: Account disabled explicit state -> is_active: {active_state}")
        else:
            print(f"  --> FAILED: PUT toggle-active responded {res.status_code} {res.text}")

    # 4. Verify Ban works (Forbidden)
    print("\n[Test 4] Verifying HTTP 403 API Access Wall...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {target_token}"})
        if res.status_code == 403:
            print("  --> SUCCESS: User receives HTTP 403 Forbidden! They are completely locked out of TambuaTips data.")
        else:
            print(f"  --> FAILED: Expected 403 but got {res.status_code} {res.text}")
            
    # Cleanup
    print("\nCleaning up...")
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        await client.put(f"/api/admin/users/{target_id}/toggle-active", headers={"Authorization": f"Bearer {admin_token}"})
        print("  --> Restored test user state.")

if __name__ == "__main__":
    asyncio.run(run_test())
