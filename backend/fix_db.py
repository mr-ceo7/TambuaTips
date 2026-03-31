import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession)

async def main():
    async with async_session() as session:
        await session.execute(text("UPDATE subscription_tiers SET price_2wk = 1250 WHERE tier_id = 'standard' AND price_2wk = 1"))
        await session.commit()
        print("Updated standard tier price to 1250")

asyncio.run(main())
