import asyncio
from app.database import AsyncSessionLocal
from app.models.subscription import SubscriptionTier

async def run_seed():
    async with AsyncSessionLocal() as db:
        # Default packages
        default_tiers = [
            {
                "tier_id": "basic",
                "name": "Basic Package",
                "description": "Basic categories.",
                "price_2wk": 550,
                "price_4wk": 860,
                "categories": ["free", "2+"],
                "popular": False,
            },
            {
                "tier_id": "standard",
                "name": "Standard Package",
                "description": "Standard categories.",
                "price_2wk": 1250,
                "price_4wk": 2000,
                "categories": ["free", "2+", "4+", "gg"],
                "popular": True,
            },
            {
                "tier_id": "premium",
                "name": "Premium Package",
                "description": "All categories.",
                "price_2wk": 2500,
                "price_4wk": 4500,
                "categories": ["free", "2+", "4+", "gg", "10+", "vip"],
                "popular": False,
            },
            # Individual tiers
            {
                "tier_id": "tier_2plus",
                "name": "2+ Odds Only",
                "description": "Access to only 2+ Odds tips.",
                "price_2wk": 300,
                "price_4wk": 500,
                "categories": ["free", "2+"],
                "popular": False,
            },
            {
                "tier_id": "tier_4plus",
                "name": "4+ Odds Only",
                "description": "Access to only 4+ Odds tips.",
                "price_2wk": 400,
                "price_4wk": 600,
                "categories": ["free", "4+"],
                "popular": False,
            },
            {
                "tier_id": "tier_gg",
                "name": "GG Only",
                "description": "Access to only GG tips.",
                "price_2wk": 400,
                "price_4wk": 600,
                "categories": ["free", "gg"],
                "popular": False,
            },
            {
                "tier_id": "tier_10plus",
                "name": "10+ Odds Only",
                "description": "Access to only 10+ Odds tips.",
                "price_2wk": 600,
                "price_4wk": 1000,
                "categories": ["free", "10+"],
                "popular": False,
            },
            {
                "tier_id": "tier_vip",
                "name": "VIP Only",
                "description": "Access to only VIP tips.",
                "price_2wk": 1500,
                "price_4wk": 2500,
                "categories": ["free", "vip"],
                "popular": False,
            }
        ]

        from sqlalchemy import select
        
        for t in default_tiers:
            result = await db.execute(select(SubscriptionTier).where(SubscriptionTier.tier_id == t["tier_id"]))
            tier = result.scalar_one_or_none()
            if not tier:
                new_tier = SubscriptionTier(**t)
                db.add(new_tier)
                print(f"Created {t['tier_id']}")
        
        await db.commit()
        print("Tiers seeding completed.")

if __name__ == "__main__":
    asyncio.run(run_seed())
