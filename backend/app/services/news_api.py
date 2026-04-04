"""
ESPN News proxy service — replaces frontend newsService.ts.
"""

import httpx
from typing import Optional

from app.services.cache import get_cached, set_cached

import asyncio
from datetime import datetime

LEAGUES = ["eng.1", "esp.1", "ita.1", "uefa.champions", "ger.1"]
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/{}/news?limit=30"

async def _fetch_league(client, league: str) -> list:
    try:
        resp = await client.get(ESPN_BASE.format(league))
        data = resp.json()
        articles = data.get("articles", [])
        return articles
    except Exception:
        return []

async def fetch_news(page: int = 1) -> dict:
    PAGE_SIZE = 12
    cache_key = "global_news_all"
    
    # Do we have all articles cached?
    all_articles = get_cached("news", cache_key)
    
    if not all_articles:
        async with httpx.AsyncClient(timeout=15) as client:
            results = await asyncio.gather(*[_fetch_league(client, lg) for lg in LEAGUES])
            
        raw_articles = []
        for res in results:
            raw_articles.extend(res)
            
        # Deduplicate by id
        unique_map = {}
        for a in raw_articles:
            aid = str(a.get("id"))
            if aid and aid not in unique_map:
                unique_map[aid] = {
                    "id": aid,
                    "title": a.get("headline", ""),
                    "source": a.get("source", "ESPN FC"),
                    "time": a.get("published", ""),
                    "image": (a.get("images") or [{}])[0].get("url", ""),
                    "category": (a.get("categories") or [{}])[0].get("description", "Football News"),
                    "link": (a.get("links") or {}).get("web", {}).get("href", "#"),
                    "raw_time": a.get("published", "")
                }
                
        all_articles = list(unique_map.values())
        
        # Sort by published time (newest first)
        def _get_time(art):
            t = art.get("raw_time", "")
            try:
                # ESPN time format: '2023-04-12T14:30:00Z'
                return datetime.fromisoformat(t.replace('Z', '+00:00')).timestamp()
            except Exception:
                return 0
                
        all_articles.sort(key=_get_time, reverse=True)
        set_cached("news", cache_key, all_articles)

    # Implement pagination properly
    start_idx = (page - 1) * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    
    paged_articles = all_articles[start_idx:end_idx]
    has_more = end_idx < len(all_articles)
    
    return {"articles": paged_articles, "hasMore": has_more}
