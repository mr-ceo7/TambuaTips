import asyncio
from app.database import AsyncSessionLocal
from sqlalchemy import select
from app.models.payment import Payment

async def check():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Payment).order_by(Payment.id.desc()).limit(1))
        p = res.scalar_one_or_none()
        if p:
            print(f"ID: {p.id}")
            print(f"Status: {p.status}")
            print(f"Ref: {p.transaction_id}")
        else:
            print("NO_PAYMENTS")

if __name__ == "__main__":
    asyncio.run(check())
