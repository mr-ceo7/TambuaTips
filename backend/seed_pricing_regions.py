import sys
import os

# Ensure app path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import asyncio
from app.database import AsyncSessionLocal
from app.models.pricing import PricingRegion

async def seed_pricing():
    async with AsyncSessionLocal() as session:
        # Add local
        local = PricingRegion(
            region_code="local",
            name="East Africa",
            currency="KES",
            currency_symbol="KES",
            countries=["KE", "UG", "TZ"],
            is_default=False
        )
        # Add international
        international = PricingRegion(
            region_code="international",
            name="Rest of World",
            currency="USD",
            currency_symbol="$",
            countries=["*"],
            is_default=True
        )
        session.add(local)
        session.add(international)
        await session.commit()
        print("Pricing regions seeded successfully.")

if __name__ == "__main__":
    asyncio.run(seed_pricing())
