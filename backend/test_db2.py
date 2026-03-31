import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession)

async def main():
    async with async_session() as session:
        result = await session.execute(text("SELECT tier_id, price_2wk, price_4wk FROM subscription_tiers"))
        for row in result:
            print(row)

asyncio.run(main())
