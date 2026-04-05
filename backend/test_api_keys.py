import httpx
import asyncio

API_BASE = "https://v3.football.api-sports.io"
keys = [
    "9470f78a803063c81e805c000700324f",
    "7b0d604f9a4a6e9bd463f1d45230e82d",
    "f4e78233669b30761bf4e3cc783c4523",
    "7d458948fe93b3ec256ba80366bb3a0a",
    "a5bf2639c1a3b4114ecaf870f3d37453",
    "e9e787bb9dffd2c7c9cf7fc0e3ba31b6",
    "1f5db6732ea8c6a6ae53cb7cf8dae9d5",
    "cd4d0ecf6e821b4fac9cd0baff246433"
]

async def test_key(key):
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.get(
                f"{API_BASE}/fixtures?date=2026-04-05",
                headers={"x-apisports-key": key},
            )
            data = response.json()
            errors = data.get("errors", [])
            if errors:
                print(f"Key {key[:10]}...: ERRORS: {errors}")
                return False
            else:
                count = len(data.get("response", []))
                print(f"Key {key[:10]}...: OK, {count} fixtures")
                return True
        except Exception as e:
            print(f"Key {key[:10]}...: EXCEPTION: {e}")
            return False

async def main():
    working_keys = []
    for key in keys:
        working = await test_key(key)
        if working:
            working_keys.append(key)
    print(f"Working keys: {working_keys}")

if __name__ == "__main__":
    asyncio.run(main())