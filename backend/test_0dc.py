import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.jackpot import Jackpot

async def test():
    async with AsyncSessionLocal() as db:
        new_jp = Jackpot(
            type='midweek',
            dc_level=0,
            matches=[
                {'homeTeam': 'Team 1', 'awayTeam': 'Team 2'},
            ],
            variations=[['1']],
            price=0,
            regional_prices={}
        )
        db.add(new_jp)
        await db.commit()
        await db.refresh(new_jp)
        print(f"Created Jackpot ID: {new_jp.id} with DC Level: {new_jp.dc_level}")
        
        # Verify it
        res = await db.execute(select(Jackpot).where(Jackpot.id == new_jp.id))
        jp = res.scalar_one_or_none()
        if jp:
            print(f"Successfully retrieved Jackpot ID: {jp.id} with DC Level: {jp.dc_level}")
            
        # Clean up
        await db.delete(jp)
        await db.commit()
        print("Cleaned up test jackpot.")

asyncio.run(test())
