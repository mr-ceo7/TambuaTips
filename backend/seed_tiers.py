import asyncio
import os
import sys
import json

# Add app to path
sys.path.append(os.getcwd())

from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.subscription import SubscriptionTier

TIERS = [
    {
        "tier_id": "basic",
        "name": "Basic",
        "description": "Perfect for casual bettors who want solid mid-range tips.",
        "price_2wk": 550,
        "price_4wk": 860,
        "categories": ["free", "4+"],
        "popular": False,
    },
    {
        "tier_id": "standard",
        "name": "Standard Plan",
        "description": "All Basic tips plus low-odds and GG picks for consistent wins.",
        "price_2wk": 1250,
        "price_4wk": 2000,
        "categories": ["free", "4+", "2+", "gg"],
        "popular": True,
    },
    {
        "tier_id": "premium",
        "name": "Premium VIP",
        "description": "The ultimate package — everything including VIP specials and high-odds tips.",
        "price_2wk": 2500,
        "price_4wk": 4500,
        "categories": ["free", "4+", "2+", "gg", "10+", "vip"],
        "popular": False,
    },
]

async def seed_tiers():
    async with AsyncSessionLocal() as db:
        for t_data in TIERS:
            # Check if exists
            result = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == t_data["tier_id"]))
            existing = result.scalar_one_or_none()
            if not existing:
                print(f"Seeding tier: {t_data['tier_id']}")
                tier = SubscriptionTier(
                    tier_id=t_data["tier_id"],
                    name=t_data["name"],
                    description=t_data["description"],
                    price_2wk=t_data["price_2wk"],
                    price_4wk=t_data["price_4wk"],
                    categories=t_data["categories"],
                    popular=t_data["popular"]
                )
                db.add(tier)
            else:
                print(f"Tier {t_data['tier_id']} already exists.")
        
        await db.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(seed_tiers())
