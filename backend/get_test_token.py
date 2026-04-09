import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

async def get_test():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        from sqlalchemy import text
        res = await conn.execute(text("SELECT phone, magic_login_token FROM users WHERE magic_login_token IS NOT NULL LIMIT 1"))
        print(res.fetchone())
        
asyncio.run(get_test())
