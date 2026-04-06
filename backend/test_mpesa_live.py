
import base64
import httpx
import asyncio

import os
from dotenv import load_dotenv

# Load env variables
load_dotenv()

async def test_mpesa_live():
    # Credentials from .env
    key = os.getenv("MPESA_CONSUMER_KEY", "NOT_SET")
    secret = os.getenv("MPESA_CONSUMER_SECRET", "NOT_SET")
    
    # Live URL
    url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    
    credentials = base64.b64encode(f"{key}:{secret}".encode()).decode()
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers={"Authorization": f"Basic {credentials}"})
            print(f"Status Code: {resp.status_code}")
            print(f"Response: {resp.text}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_mpesa_live())
