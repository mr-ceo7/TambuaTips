import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal

from app.models.user import User
from app.models.payment import Payment
from app.models.activity import UserActivity, AnonymousActivity, AnonymousVisitor
from app.models.subscription import SubscriptionTier
from app.models.jackpot import Jackpot, JackpotPurchase

async def main():
    async with AsyncSessionLocal() as db:
        tiers = (await db.execute(select(SubscriptionTier))).scalars().all()
        for t in tiers:
            if t.tier_id == "basic":
                t.regional_prices = {"international": {"price_2wk": 4.99, "price_4wk": 7.99}}
            elif t.tier_id == "standard":
                t.regional_prices = {"international": {"price_2wk": 9.99, "price_4wk": 15.99}}
            elif t.tier_id == "premium":
                t.regional_prices = {"international": {"price_2wk": 19.99, "price_4wk": 34.99}}
            db.add(t)

        jackpots = (await db.execute(select(Jackpot))).scalars().all()
        for jp in jackpots:
            jp.regional_prices = {"international": {"price": 10.99}}
            db.add(jp)
            
        await db.commit()

if __name__ == "__main__":
    asyncio.run(main())
