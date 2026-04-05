import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.jackpot import Jackpot
from app.database import engine, AsyncSessionLocal

async def seed():
    async with AsyncSessionLocal() as session:
        mock_matches = [
            {"homeTeam": "Arsenal", "awayTeam": "Aston Villa", "pick": "12"},
            {"homeTeam": "Brentford", "awayTeam": "Liverpool", "pick": "X"},
            {"homeTeam": "Chelsea", "awayTeam": "Everton", "pick": "2"},
            {"homeTeam": "Man City", "awayTeam": "Newcastle", "pick": "1"},
            {"homeTeam": "Man Utd", "awayTeam": "Tottenham", "pick": "1X"},
            {"homeTeam": "Nott Forest", "awayTeam": "Wolves", "pick": "12"},
            {"homeTeam": "Crystal Palace", "awayTeam": "West Ham", "pick": "X"},
            {"homeTeam": "Sheffield Utd", "awayTeam": "Burnley", "pick": "2"},
            {"homeTeam": "Fulham", "awayTeam": "Luton", "pick": "1"},
            {"homeTeam": "Brighton", "awayTeam": "Bournemouth", "pick": "12"},
            {"homeTeam": "Bologna", "awayTeam": "Roma", "pick": "1"},
            {"homeTeam": "Lazio", "awayTeam": "Torino", "pick": "X"},
            {"homeTeam": "Fiorentina", "awayTeam": "Genoa", "pick": "12"}
        ]
        jackpot = Jackpot(
            type="midweek",
            dc_level=4,
            matches=mock_matches,
            price=250,
            regional_prices={"international": {"price": 2.99}}
        )
        session.add(jackpot)
        await session.commit()
        print("Mock Jackpot seeded successfully!")

asyncio.run(seed())
