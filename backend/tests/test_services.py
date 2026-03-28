import pytest
from unittest.mock import patch, MagicMock
from app.services.news_api import fetch_news
from app.services.sports_api import fetch_fixtures_by_date

@pytest.mark.asyncio
async def test_news_api_resilience():
    # Mock httpx to raise an exception
    with patch("httpx.AsyncClient.get", side_effect=Exception("External API Down")):
        result = await fetch_news()
        # Should return empty articles instead of crashing
        assert result == {"articles": [], "hasMore": False}

@pytest.mark.asyncio
async def test_sports_api_exhaustion_resilience():
    # Test that it raises specific error when all keys fail/exhausted 
    # (Simplified test: mock _api_fetch to raise)
    with patch("app.services.sports_api._api_fetch", side_effect=Exception("ALL_KEYS_EXHAUSTED")):
        with pytest.raises(Exception) as excinfo:
            await fetch_fixtures_by_date()
        assert "ALL_KEYS_EXHAUSTED" in str(excinfo.value)
