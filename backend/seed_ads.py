import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.ad import AdPost

async def seed_ads():
    ads_data = [
        {
            "title": "TAMBUA TIPS - KEEP YOUR TIPS UP",
            "image_url": "/brand-ad.jpeg",
            "link_url": "/tips",
            "category": "Promo",
            "is_active": True,
        },
        {
            "title": "🎁 Invite Friends & Get Free Daily Tips! Share your referral link and unlock exclusive predictions.",
            "image_url": "https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=800&auto=format&fit=crop",
            "link_url": "/tips",
            "category": "Promo",
            "is_active": True,
        },
        {
            "title": "🏆 Go Premium — Get Exclusive Expert Tips with 75%+ Win Rate. Join the winning team today!",
            "image_url": "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?q=80&w=800&auto=format&fit=crop",
            "link_url": "/tips",
            "category": "Promo",
            "is_active": True,
        },
        {
            "title": "🔔 Never Miss a Winning Tip! Subscribe for daily free picks and premium alerts delivered straight to you.",
            "image_url": "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=800&auto=format&fit=crop",
            "link_url": "/tips",
            "category": "Promo",
            "is_active": True,
        }
    ]

    async with AsyncSessionLocal() as session:
        for val in ads_data:
            ad = AdPost(**val)
            session.add(ad)
        await session.commit()
    print("Seeded 4 hardcoded ads into the database!")

if __name__ == "__main__":
    asyncio.run(seed_ads())
