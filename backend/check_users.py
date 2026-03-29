import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(text("SELECT email, subscription_tier, subscription_expires_at FROM users"))
        rows = res.fetchall()
        for row in rows:
            print(f'User: {row[0]}, Tier: {row[1]}, Expires: {row[2]}')

if __name__ == "__main__":
    asyncio.run(check())
