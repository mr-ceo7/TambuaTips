import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings

async def alter_db():
    engine = create_async_engine(settings.DATABASE_URL)
    async with engine.begin() as conn:
        from sqlalchemy import text
        try:
            # Drop column if it exists just to be safe
            try:
                await conn.execute(text("ALTER TABLE users DROP COLUMN magic_login_token;"))
            except Exception:
                pass
                
            await conn.execute(text("ALTER TABLE users ADD COLUMN magic_login_token VARCHAR(32) NULL DEFAULT NULL;"))
            print("Successfully added magic_login_token column")
            await conn.execute(text("CREATE UNIQUE INDEX idx_users_magic_token ON users(magic_login_token);"))
            print("Successfully created index idx_users_magic_token")
        except Exception as e:
            print(f"Error: {e}")
            
if __name__ == "__main__":
    asyncio.run(alter_db())
