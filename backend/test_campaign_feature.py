import asyncio
import httpx
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models.campaign import Campaign

UTC = timezone.utc

async def test_campaign_feature():
    # 1. Fetch tiers before campaign
    print("--- BEFORE CAMPAIGN ---")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://127.0.0.1:8000/api/subscriptions/tiers")
            resp.raise_for_status()
            tiers = resp.json()
            for t in tiers:
                print(f"Tier: {t['name']} | Price (2wk): {t['price_2wk']} | Original (2wk): {t.get('original_price_2wk')}")
        except Exception as e:
            print(f"Failed to fetch tiers: {e}")

    # 2. Insert Campaign in DB
    print("\n--- INSERTING CAMPAIGN ---")
    now = datetime.now(UTC).replace(tzinfo=None)
    campaign = Campaign(
        slug="terminal-test-campaign",
        title="Terminal Test Campaign",
        banner_text="Test Banner!",
        description="Just testing the CLI",
        incentive_type="discount",
        incentive_value=20, # 20% discount
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=2),
        is_active=True
    )
    
    async with AsyncSessionLocal() as session:
        session.add(campaign)
        await session.commit()
        await session.refresh(campaign)
        campaign_id = campaign.id
    print(f"Inserted campaign with ID {campaign_id} (20% discount)")

    # 3. Fetch tiers after campaign
    print("\n--- AFTER CAMPAIGN ---")
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get("http://127.0.0.1:8000/api/subscriptions/tiers")
            resp.raise_for_status()
            tiers = resp.json()
            for t in tiers:
                print(f"Tier: {t['name']} | Price (2wk): {t['price_2wk']} | Original (2wk): {t.get('original_price_2wk')}")
        except Exception as e:
            print(f"Failed to fetch tiers: {e}")

    # 4. Clean up DB
    print("\n--- CLEANING UP ---")
    async with AsyncSessionLocal() as session:
        # fetch and delete
        await session.delete(campaign)
        await session.commit()
    print("Test Campaign Cleaned Up.")

if __name__ == "__main__":
    asyncio.run(test_campaign_feature())
