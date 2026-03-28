"""
ESPN News proxy service — replaces frontend newsService.ts.
"""

import httpx
from typing import Optional

from app.services.cache import get_cached, set_cached

ESPN_API = "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news"


async def fetch_news(page: int = 1) -> dict:
    cache_key = f"news_page_{page}"
    cached = get_cached("news", cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{ESPN_API}?limit=6&page={page}")
            data = resp.json()

        if data.get("articles"):
            articles = []
            for i, article in enumerate(data["articles"]):
                articles.append({
                    "id": str(article.get("id", f"{page}-{i}")),
                    "title": article.get("headline", ""),
                    "source": article.get("source", "ESPN FC"),
                    "time": article.get("published", ""),
                    "image": (article.get("images") or [{}])[0].get("url", ""),
                    "category": (article.get("categories") or [{}])[0].get("description", "Premier League"),
                    "link": (article.get("links") or {}).get("web", {}).get("href", "#"),
                })

            result = {"articles": articles, "hasMore": len(data["articles"]) == 6}
            set_cached("news", cache_key, result)
            return result

        return {"articles": [], "hasMore": False}

    except Exception:
        return {"articles": [], "hasMore": False}
