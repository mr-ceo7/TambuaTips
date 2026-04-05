"""
Seed script for mock jackpot data with multi-variation DC support.
Run: python3 scripts/seed_jackpots.py
"""
import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, delete
from app.database import AsyncSessionLocal
from app.models.jackpot import Jackpot, JackpotPurchase

async def seed():
    async with AsyncSessionLocal() as session:
        # Clear existing data (purchases first due to FK)
        await session.execute(delete(JackpotPurchase))
        await session.execute(delete(Jackpot))
        await session.commit()
        
        # Midweek Jackpot: 13 matches, 4 variations (4DC)
        midweek = Jackpot(
            type='midweek',
            dc_level=4,
            price=99.0,
            matches=[
                {"homeTeam": "Everton", "awayTeam": "Liverpool"},
                {"homeTeam": "Arsenal", "awayTeam": "Man City"},
                {"homeTeam": "Chelsea", "awayTeam": "Tottenham"},
                {"homeTeam": "Real Madrid", "awayTeam": "Barcelona"},
                {"homeTeam": "Bayern Munich", "awayTeam": "Dortmund"},
                {"homeTeam": "PSG", "awayTeam": "Marseille"},
                {"homeTeam": "AC Milan", "awayTeam": "Inter"},
                {"homeTeam": "Juventus", "awayTeam": "Napoli"},
                {"homeTeam": "Ajax", "awayTeam": "PSV"},
                {"homeTeam": "Porto", "awayTeam": "Benfica"},
                {"homeTeam": "Celtic", "awayTeam": "Rangers"},
                {"homeTeam": "Fenerbahce", "awayTeam": "Galatasaray"},
                {"homeTeam": "Boca Juniors", "awayTeam": "River Plate"},
            ],
            variations=[
                ["12", "2", "2", "1", "X", "2", "12", "1", "X", "2", "12", "X", "12"],
                ["X", "2", "12", "X", "X", "1X", "1", "2", "1", "12", "2", "1X", "1"],
                ["X", "X2", "2", "1X", "1X", "X", "2", "2", "X", "1", "2", "1", "1X"],
                ["X2", "2", "X", "X", "1", "X", "12", "2", "2", "2", "12", "1X", "X"],
            ],
        )

        # Mega Jackpot: 17 matches, 3 variations (5DC)
        mega = Jackpot(
            type='mega',
            dc_level=5,
            price=199.0,
            matches=[
                {"homeTeam": "Liverpool", "awayTeam": "Chelsea"},
                {"homeTeam": "Man City", "awayTeam": "Arsenal"},
                {"homeTeam": "Napoli", "awayTeam": "Lazio"},
                {"homeTeam": "Lyon", "awayTeam": "Lille"},
                {"homeTeam": "Sevilla", "awayTeam": "Valencia"},
                {"homeTeam": "Aston Villa", "awayTeam": "Newcastle"},
                {"homeTeam": "Fulham", "awayTeam": "Wolves"},
                {"homeTeam": "West Ham", "awayTeam": "Brighton"},
                {"homeTeam": "Bournemouth", "awayTeam": "Watford"},
                {"homeTeam": "Norwich", "awayTeam": "Derby"},
                {"homeTeam": "Preston", "awayTeam": "Bristol City"},
                {"homeTeam": "Cardiff", "awayTeam": "Swansea"},
                {"homeTeam": "Millwall", "awayTeam": "QPR"},
                {"homeTeam": "Sunderland", "awayTeam": "Hull"},
                {"homeTeam": "Luton", "awayTeam": "Middlesbrough"},
                {"homeTeam": "Reading", "awayTeam": "Barnsley"},
                {"homeTeam": "Palmeiras", "awayTeam": "Flamengo"},
            ],
            variations=[
                ["1", "12", "X", "1", "1", "X", "1", "1", "2", "1", "1X", "X2", "12", "1", "X", "1", "X2"],
                ["1X", "1", "X2", "12", "1X", "1", "12", "X", "1", "2", "1", "X", "1", "X2", "1X", "12", "1"],
                ["2", "X", "1", "X2", "12", "1X", "X", "12", "X", "1X", "2", "1", "X2", "12", "1", "X", "12"],
            ],
        )

        session.add(midweek)
        session.add(mega)
        await session.commit()
        print("✅ Seeded Midweek (13 matches, 4 variations) and Mega (17 matches, 3 variations) jackpots!")

if __name__ == "__main__":
    asyncio.run(seed())
