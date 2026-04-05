import asyncio
import os
import sys

# Add the parent directory to sys.path so we can import from 'app'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.jackpot import Jackpot

async def seed():
    async with AsyncSessionLocal() as session:
        # Check if already seeded (based on approximate match count)
        result = await session.execute(select(Jackpot))
        jackpots = result.scalars().all()
        
        # Add Midweek Jackpot (13 matches)
        midweek = Jackpot(
            type='midweek',
            dc_level=3,
            price=99.0,
            matches=[
                {"homeTeam": "Everton", "awayTeam": "Liverpool", "pick": "2", "result": "pending"},
                {"homeTeam": "Arsenal", "awayTeam": "Man City", "pick": "12", "result": "pending"},
                {"homeTeam": "Chelsea", "awayTeam": "Tottenham", "pick": "X", "result": "pending"},
                {"homeTeam": "Real Madrid", "awayTeam": "Barcelona", "pick": "1", "result": "pending"},
                {"homeTeam": "Bayern Munich", "awayTeam": "Dortmund", "pick": "1", "result": "pending"},
                {"homeTeam": "PSG", "awayTeam": "Marseille", "pick": "1", "result": "pending"},
                {"homeTeam": "AC Milan", "awayTeam": "Inter", "pick": "12", "result": "pending"},
                {"homeTeam": "Juventus", "awayTeam": "Napoli", "pick": "X", "result": "pending"},
                {"homeTeam": "Ajax", "awayTeam": "PSV", "pick": "1X", "result": "pending"},
                {"homeTeam": "Porto", "awayTeam": "Benfica", "pick": "2", "result": "pending"},
                {"homeTeam": "Celtic", "awayTeam": "Rangers", "pick": "1", "result": "pending"},
                {"homeTeam": "Fenerbahce", "awayTeam": "Galatasaray", "pick": "X2", "result": "pending"},
                {"homeTeam": "Boca Juniors", "awayTeam": "River Plate", "pick": "12", "result": "pending"}
            ]
        )
        
        # Add Mega Jackpot (17 matches)
        mega = Jackpot(
            type='mega',
            dc_level=5,
            price=199.0,
            matches=[
                {'homeTeam': 'Liverpool', 'awayTeam': 'Chelsea', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Man City', 'awayTeam': 'Arsenal', 'pick': '12', 'result': 'pending'},
                {'homeTeam': 'Napoli', 'awayTeam': 'Lazio', 'pick': 'X', 'result': 'pending'},
                {'homeTeam': 'Lyon', 'awayTeam': 'Lille', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Sevilla', 'awayTeam': 'Valencia', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Aston Villa', 'awayTeam': 'Newcastle', 'pick': 'X', 'result': 'pending'},
                {'homeTeam': 'Fulham', 'awayTeam': 'Wolves', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'West Ham', 'awayTeam': 'Brighton', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Bournemouth', 'awayTeam': 'Watford', 'pick': '2', 'result': 'pending'},
                {'homeTeam': 'Norwich', 'awayTeam': 'Derby', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Preston', 'awayTeam': 'Bristol City', 'pick': '1X', 'result': 'pending'},
                {'homeTeam': 'Cardiff', 'awayTeam': 'Swansea', 'pick': 'X2', 'result': 'pending'},
                {'homeTeam': 'Millwall', 'awayTeam': 'QPR', 'pick': '12', 'result': 'pending'},
                {'homeTeam': 'Sunderland', 'awayTeam': 'Hull', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Luton', 'awayTeam': 'Middlesbrough', 'pick': 'X', 'result': 'pending'},
                {'homeTeam': 'Reading', 'awayTeam': 'Barnsley', 'pick': '1', 'result': 'pending'},
                {'homeTeam': 'Palmeiras', 'awayTeam': 'Flamengo', 'pick': 'X2', 'result': 'pending'}
            ]
        )
        
        session.add(midweek)
        session.add(mega)
        await session.commit()
        print("Mock Midweek and Mega Jackpots seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
