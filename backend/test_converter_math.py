import asyncio
import time
from app.services.exchange_rate import get_kes_to_usd_rate

async def main():
    print("--- LIVE CURRENCY CONVERSION TEST ---")
    
    # Simulate a user buying the Premium Tier (KES 2500)
    test_amount_kes = 2500
    
    start_time = time.time()
    
    # 1. Fetch live rate
    live_rate = await get_kes_to_usd_rate()
    print(f"\n[1] Current Live Rate fetched: 1 USD = {live_rate} KES")
    
    # 2. Perform the exact math used in payments.py
    usd_amount = round(test_amount_kes / live_rate, 2)
    
    # 3. Apply the minimum floor safety check
    if usd_amount < 0.01: 
        usd_amount = 0.01

    elapsed = time.time() - start_time
    
    print(f"[2] Math executed: {test_amount_kes} KES / {live_rate} = {test_amount_kes/live_rate}")
    print(f"[3] PayPal Final Rounded Amount: ${usd_amount} USD")
    print(f"\nTotal Time Taken: {elapsed:.4f} seconds!")
    print("-------------------------------------")

if __name__ == "__main__":
    asyncio.run(main())
