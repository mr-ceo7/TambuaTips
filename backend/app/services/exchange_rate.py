import httpx
from datetime import datetime, timedelta

# Global Cache to prevent spamming the external API
_RATE_CACHE = None
_CACHE_EXPIRES = None

async def get_kes_to_usd_rate() -> float:
    """
    Fetches the live KES to USD exchange rate (i.e. how many KES = 1 USD).
    Caches the result in-memory for 12 hours.
    Falls back to a safe default of 130.0 if the API call fails.
    """
    global _RATE_CACHE, _CACHE_EXPIRES
    
    # Return cached rate if it's still valid
    if _RATE_CACHE is not None and _CACHE_EXPIRES and datetime.utcnow() < _CACHE_EXPIRES:
        return _RATE_CACHE
        
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # exchangerate-api.com updates once daily and is completely free/no-auth
            response = await client.get("https://api.exchangerate-api.com/v4/latest/USD")
            response.raise_for_status()
            data = response.json()
            
            # Extract KES rate (Example: 1 USD = 132.50 KES)
            kes_rate = data.get("rates", {}).get("KES")
            
            if kes_rate and float(kes_rate) > 0:
                _RATE_CACHE = float(kes_rate)
                _CACHE_EXPIRES = datetime.utcnow() + timedelta(hours=12)
                return _RATE_CACHE
    except Exception as e:
        print(f"[Currency API] Failed to fetch live exchange rate: {e}")
        
    # If the cache is completely empty and the API failed, fallback to 130.0 KES = 1 USD
    if _RATE_CACHE is None:
        return 130.0
        
    # If API failed but we have a stale cache, keep using the stale cache
    return _RATE_CACHE
