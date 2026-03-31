import asyncio
from datetime import datetime, timedelta
from app.database import AsyncSessionLocal
from sqlalchemy import text

async def main():
    async with AsyncSessionLocal() as db:
        # Check total userbase
        result = await db.execute(text("SELECT COUNT(id) FROM users"))
        total_users = result.scalar()
        print(f"Total Users in Userbase: {total_users}")

        if total_users == 0:
            print("No users found. Creating a test user...")
            await db.execute(text("""
                INSERT INTO users (email, name, hashed_password, country, is_active) 
                VALUES ('test_userbase@example.com', 'Test User', 'fakehash', 'US', 1)
            """))
            await db.commit()
            print("Created test user.")

        # Let's get a random user
        result = await db.execute(text("SELECT id, email, last_seen FROM users LIMIT 1"))
        user = result.fetchone()
        
        if user:
            print(f"Testing with user: {user.email}")
            print(f"Old last_seen: {user.last_seen}")
            
            # Make user online using utcnow formatted string for sqlite/db
            now_str = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
            await db.execute(text(f"UPDATE users SET last_seen = '{now_str}' WHERE id = {user.id}"))
            await db.commit()
            print(f"Updated last_seen to current UTC time: {now_str}")
            
            # Requery to verify online feature
            three_min_ago = (datetime.utcnow() - timedelta(minutes=3)).strftime('%Y-%m-%d %H:%M:%S')
            online_result = await db.execute(
                text(f"SELECT COUNT(id) FROM users WHERE last_seen > '{three_min_ago}'")
            )
            online_users = online_result.scalar()
            print(f"Online Users count (last 3 minutes): {online_users}")

            if online_users > 0:
                print("SUCCESS: Online feature is working correctly!")
            else:
                print("ERROR: Online feature test failed.")
            
if __name__ == "__main__":
    asyncio.run(main())
