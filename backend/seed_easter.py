import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign
from sqlalchemy import select

UTC = timezone.utc

async def setup_easter_campaign():
    async with AsyncSessionLocal() as session:
        # Check if already exists
        result = await session.execute(select(Campaign).where(Campaign.slug == "easter-special-15"))
        existing = result.scalar_one_or_none()
        
        if existing:
            print("Easter campaign already exists in the database.")
            return

        now = datetime.now(UTC).replace(tzinfo=None)
        
        # Create Easter Campaign
        campaign = Campaign(
            slug="easter-special-15",
            title="Easter Special - 15 Years of TambuaTips",
            description="Celebrating 15 years of winning together! Enjoy a special Easter discount on all our premium subscription tiers.",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=14),
            incentive_type="discount",
            incentive_value=20.0,  # 20% Discount
            banner_text="🐣 EASTER SPECIAL: 15 Years Anniversary Discount!",
            asset_video_url="/easterspecial.mp4",
            asset_image_url="/easter.jpeg",
            og_image_url="/easter.jpeg",
            is_active=False  # User will toggle it manually as requested
        )
        
        session.add(campaign)
        await session.commit()
        print("Easter Campaign successfully added to the database. It is currently turned OFF. You can toggle it ON from the Admin Panel -> Campaigns.")

if __name__ == "__main__":
    asyncio.run(setup_easter_campaign())
