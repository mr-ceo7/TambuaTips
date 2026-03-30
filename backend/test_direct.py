import asyncio
import httpx
import uuid
import json
import sqlite3

def make_admin(email):
    conn = sqlite3.connect("tambuatips.db")
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET is_admin = 1 WHERE email = ?", (email,))
    conn.commit()
    conn.close()

async def run_test():
    base_url = "http://localhost:8000"
    client = httpx.AsyncClient(base_url=base_url)
    
    # 1. Register users
    print("[1] Registering Test Admin...", flush=True)
    admin_email = f"admin_{uuid.uuid4().hex[:6]}@tambua.com"
    res1 = await client.post("/api/auth/register", json={
        "name": "Admin Test", "email": admin_email, "password": "password123"
    })
    admin_token = res1.json()["access_token"]
    
    print("[2] Promoting Admin via SQLite...", flush=True)
    make_admin(admin_email)

    print("[3] Registering standard User...", flush=True)
    target_email = f"target_{uuid.uuid4().hex[:6]}@tambua.com"
    res2 = await client.post("/api/auth/register", json={
        "name": "Target Test", "email": target_email, "password": "password123"
    })
    target_token = res2.json()["access_token"]
    
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {target_token}"})
    target_id = res.json()["id"]

    # 4. Telemetry Ping
    print("\n--- Testing Activity Telemetry Ping ---", flush=True)
    res = await client.post("/api/auth/activity", 
        json={"path": "/tips", "time_spent": 85},
        headers={"Authorization": f"Bearer {target_token}"}
    )
    if res.status_code == 200:
        print("  --> SUCCESS: User tracked 85 seconds on /tips", flush=True)
    else:
        print(f"  --> FAILED: {res.status_code} {res.text}", flush=True)

    # 5. Query Dashboard
    print("\n--- Testing Admin Dashboard Aggregation ---", flush=True)
    res = await client.get("/api/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    if res.status_code == 200:
        users = res.json()
        target_metrics = next((u for u in users if u["id"] == target_id), None)
        if target_metrics:
            print("  --> SUCCESS: Admin recovered target user data", flush=True)
            print(f"      - Most Visited Page: {target_metrics['most_visited_page']}", flush=True)
            print(f"      - Total Time Tracked: {target_metrics['total_time_spent']} sec", flush=True)
            print(f"      - Online Status: {target_metrics['is_online']}", flush=True)
    else:
        print(f"  --> FAILED: GET /users responded {res.status_code}", flush=True)

    # 6. Apply Ban
    print("\n--- Executing Admin Ban Command ---", flush=True)
    res = await client.put(f"/api/admin/users/{target_id}/toggle-active", headers={"Authorization": f"Bearer {admin_token}"})
    if res.status_code == 200:
        print(f"  --> SUCCESS: Banned explicitly. is_active={res.json()['is_active']}", flush=True)

    # 7. Access Refused check
    print("\n--- Verifying Strict Forbidden Firewall ---", flush=True)
    res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {target_token}"})
    if res.status_code == 403:
        print("  --> SUCCESS: Backend verified 403 FORBIDDEN - User completely locked out!", flush=True)
    else:
        print(f"  --> FAILED: Expected 403, got {res.status_code}", flush=True)

    await client.aclose()

if __name__ == "__main__":
    asyncio.run(run_test())
