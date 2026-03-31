import asyncio
import time
from app.services.exchange_rate import get_kes_to_usd_rate

async def main():
    print("Testing Currency Exchange Rate Fetching...")
    
    start_time = time.time()
    rate1 = await get_kes_to_usd_rate()
    elapsed1 = time.time() - start_time
    print(f"1st Fetch (API): 1 USD = {rate1} KES (took {elapsed1:.4f} seconds)")
    
    start_time = time.time()
    rate2 = await get_kes_to_usd_rate()
    elapsed2 = time.time() - start_time
    print(f"2nd Fetch (CACHE): 1 USD = {rate2} KES (took {elapsed2:.4f} seconds)")
    
    if elapsed2 < elapsed1 and rate1 == rate2:
        print("SUCCESS: In-Memory cache works flawlessly.")
    else:
        print("WARNING: Cache verification unclear.")

if __name__ == "__main__":
    asyncio.run(main())
