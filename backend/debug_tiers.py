import asyncio
from app.database import AsyncSessionLocal
from app.models.subscription import SubscriptionTier
from sqlalchemy import select

async def check():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(SubscriptionTier))
        tiers = result.scalars().all()
        print(f"Found {len(tiers)} tiers in DB")
        for t in tiers:
            print(f"ID: {t.id}, TierID: {t.tier_id}, Name: {t.name}, Price2wk: {t.price_2wk}, Price4wk: {t.price_4wk}")

if __name__ == "__main__":
    asyncio.run(check())
