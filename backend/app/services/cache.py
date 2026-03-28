"""
Server-side in-memory cache with TTL support.
"""

from cachetools import TTLCache

# Global cache stores — each with different TTLs
_fixtures_cache = TTLCache(maxsize=500, ttl=3600)       # 1 hour
_standings_cache = TTLCache(maxsize=100, ttl=21600)      # 6 hours
_h2h_cache = TTLCache(maxsize=200, ttl=7200)             # 2 hours
_news_cache = TTLCache(maxsize=50, ttl=3600)             # 1 hour
_live_cache = TTLCache(maxsize=100, ttl=60)              # 1 minute

CACHE_STORES = {
    "fixtures": _fixtures_cache,
    "standings": _standings_cache,
    "h2h": _h2h_cache,
    "news": _news_cache,
    "live": _live_cache,
}


def get_cached(store_name: str, key: str):
    store = CACHE_STORES.get(store_name)
    if store is None:
        return None
    return store.get(key)


def set_cached(store_name: str, key: str, data):
    store = CACHE_STORES.get(store_name)
    if store is not None:
        store[key] = data


def clear_cache(store_name: str = None):
    if store_name:
        store = CACHE_STORES.get(store_name)
        if store:
            store.clear()
    else:
        for store in CACHE_STORES.values():
            store.clear()
