import asyncio
from app.config import settings

async def main():
    print("LOADED ORIGINS:", settings.cors_origins)

if __name__ == "__main__":
    asyncio.run(main())
