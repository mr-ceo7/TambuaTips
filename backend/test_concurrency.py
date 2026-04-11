import asyncio
import httpx

async def test_concurrency():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # First, login with our magic token
        print("Logging in...")
        resp = await client.post("/api/auth/magic-login", json={"token": "02f6cc8d02d34e5e8ea00ca576e9c5de"})
        if resp.status_code != 200:
            print(f"Login failed: {resp.status_code}")
            return
            
        print("Logged in successfully. Access token length:", len(client.cookies.get("access_token") or ""))
        
        token = client.cookies.get("access_token")
        
        # Fire 20 simultaneous requests to /api/auth/me to simulate a burst
        print("\nFiring 20 simultaneous requests...")
        
        async def fetch(i):
            resp = await client.get("/api/auth/me", cookies={"access_token": token})
            return i, resp.status_code
            
        tasks = [fetch(i) for i in range(20)]
        results = await asyncio.gather(*tasks)
        
        successes = sum(1 for _, status in results if status == 200)
        errors = sum(1 for _, status in results if status == 500)
        unauths = sum(1 for _, status in results if status == 401)
        
        print("\nResults:")
        print(f"Total Requests: {len(tasks)}")
        print(f"Successes (200): {successes}")
        print(f"Server Errors (500): {errors}")
        print(f"Unauthorized (401): {unauths}")
        print("\nConcurrency test completed successfully." if errors == 0 else "\nFAIL: 500 errors detected.")

if __name__ == "__main__":
    asyncio.run(test_concurrency())
