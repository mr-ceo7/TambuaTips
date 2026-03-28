import asyncio
from datetime import datetime
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.payment import Payment
from app.models.jackpot import Jackpot

async def seed():
    async with AsyncSessionLocal() as db:
        # Create a Midweek Jackpot
        midweek = Jackpot(
            type="midweek",
            dc_level=13,
            matches=[
                {"home": "Arsenal", "away": "Liverpool", "prediction": "1"},
                {"home": "Real Madrid", "away": "Barcelona", "prediction": "X"},
                {"home": "Bayern", "away": "Dortmund", "prediction": "1"},
                {"home": "PSG", "away": "Marseille", "prediction": "2"},
                {"home": "Inter", "away": "Milan", "prediction": "1"},
                {"home": "City", "away": "United", "prediction": "1"},
                {"home": "Chelsea", "away": "Spurs", "prediction": "X"},
                {"home": "Ajax", "away": "PSV", "prediction": "1"},
                {"home": "Porto", "away": "Benfica", "prediction": "2"},
                {"home": "Napoli", "away": "Juventus", "prediction": "1"},
                {"home": "Roma", "away": "Lazio", "prediction": "X"},
                {"home": "Atletico", "away": "Sevilla", "prediction": "1"},
                {"home": "Leipzig", "away": "Leverkusen", "prediction": "2"},
            ],
            price=299
        )
        
        # Create a Mega Jackpot
        mega = Jackpot(
            type="mega",
            dc_level=17,
            matches=[{"home": f"Team A{i}", "away": f"Team B{i}", "prediction": "1"} for i in range(17)],
            price=499
        )
        
        db.add(midweek)
        db.add(mega)
        await db.commit()
        print("Mock Jackpots seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
