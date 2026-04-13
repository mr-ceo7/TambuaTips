"""
API-Football proxy service with server-side key rotation.
Replaces frontend apiRotator.ts + sportsApiService.ts.
"""

import asyncio
import httpx
import logging
import time
from typing import Optional, List
from datetime import date

from app.config import settings
from app.services.cache import get_cached, set_cached

logger = logging.getLogger(__name__)

API_BASE = "https://v3.football.api-sports.io"

# Track usage / state per key (in-memory; resets on server restart)
_key_usage: dict[str, dict] = {}  # {key: {date: str, count: int, limit_day: int, blocked_until: float, last_request: float, exhausted: bool, reason: str}}


def _get_today() -> str:
    return date.today().isoformat()


def _get_key_info(key: str) -> dict:
    today = _get_today()
    entry = _key_usage.get(key)
    if not entry or entry.get("date") != today:
        entry = {
            "date": today,
            "count": 0,
            "limit_day": 7500,  # Default safe fallback
            "blocked_until": 0.0,
            "last_request": 0.0,
            "exhausted": False,
            "reason": None,
        }
        _key_usage[key] = entry
    return entry


def _get_key_usage(key: str) -> int:
    return _get_key_info(key)["count"]


def _increment_key(key: str):
    entry = _get_key_info(key)
    entry["count"] += 1


def _mark_key_exhausted(key: str, reason: str | None = None):
    entry = _get_key_info(key)
    entry["exhausted"] = True
    entry["reason"] = reason


def _mark_key_blocked_for_minute(key: str):
    entry = _get_key_info(key)
    entry["blocked_until"] = time.time() + 61


def _is_key_available(key: str) -> bool:
    entry = _get_key_info(key)
    if entry["exhausted"]:
        return False
    if entry["blocked_until"] and time.time() < entry["blocked_until"]:
        return False
    if entry["count"] >= entry["limit_day"]:
        return False
    return True


def _is_exhaustion_error(data: dict, status_code: int) -> bool:
    if status_code == 429:
        return True
    errors = data.get("errors")
    if not errors:
        return False
    err_str = str(errors).lower()
    return any(w in err_str for w in ["rate", "suspended", "forbidden", "quota", "access"])


def _update_key_quota_from_headers(key: str, headers: dict):
    remaining_daily = headers.get("x-ratelimit-requests-remaining")
    limit_daily = headers.get("x-ratelimit-requests-limit") or headers.get("X-RateLimit-Requests-Limit")

    entry = _get_key_info(key)

    if limit_daily is not None:
        try:
            entry["limit_day"] = int(limit_daily)
        except ValueError:
            pass

    if remaining_daily is not None:
        try:
            if int(remaining_daily) <= 0:
                _mark_key_exhausted(key, "daily quota exhausted")
                return
        except ValueError:
            pass

    remaining_minute = headers.get("x-ratelimit-remaining") or headers.get("X-RateLimit-Remaining")
    if remaining_minute is not None:
        try:
            if int(remaining_minute) <= 0:
                _mark_key_blocked_for_minute(key)
        except ValueError:
            pass


def _get_best_key() -> Optional[str]:
    keys = settings.api_football_key_list
    if not keys:
        return None

    active_keys = [key for key in keys if _is_key_available(key)]
    if not active_keys:
        return None

    return sorted(active_keys, key=lambda k: _get_key_usage(k))[0]


async def _api_fetch(endpoint: str) -> dict:
    """Make a request to API-Football with automatic key rotation and throttling."""
    keys = settings.api_football_key_list
    if not keys:
        logger.warning("No API-Football keys configured")
        return {}

    async with httpx.AsyncClient(timeout=30) as client:
        # Sort keys to use the one with the lowest count first
        for key in sorted(keys, key=lambda k: _get_key_usage(k)):
            if not _is_key_available(key):
                continue

            entry = _get_key_info(key)
            
            # Per-second throttling: max 5 req/sec (200ms delay)
            now = time.time()
            elapsed = now - entry["last_request"]
            if elapsed < 0.2:
                await asyncio.sleep(0.2 - elapsed)
                now = time.time()

            try:
                response = await client.get(
                    f"{API_BASE}{endpoint}",
                    headers={"x-apisports-key": key},
                )
                entry["last_request"] = now
                _increment_key(key)
                data = response.json()
                _update_key_quota_from_headers(key, response.headers)

                if _is_exhaustion_error(data, response.status_code):
                    reason = data.get("errors") or f"status_{response.status_code}"
                    logger.warning(
                        "API-Football key blocked/exhausted: %s reason=%s",
                        key[:8],
                        reason,
                    )
                    _mark_key_exhausted(key, str(reason))
                    continue

                if response.status_code != 200:
                    logger.warning(
                        "API-Football returned non-200 status %s for key %s",
                        response.status_code,
                        key[:8],
                    )
                    continue

                return data

            except httpx.HTTPStatusError as exc:
                logger.warning("HTTP error for API-Football key %s: %s", key[:8], exc)
                if exc.response is not None and exc.response.status_code == 429:
                    _mark_key_blocked_for_minute(key)
                continue
            except Exception as exc:
                logger.warning("API-Football request failed for key %s: %s", key[:8], exc)
                continue

    logger.warning("ALL_KEYS_EXHAUSTED")
    return {}


def _map_fixture(item: dict) -> dict:
    status_short = item["fixture"]["status"]["short"]
    if status_short in ("1H", "2H", "HT", "ET", "P", "LIVE"):
        status = "live"
    elif status_short in ("FT", "AET", "PEN"):
        status = "finished"
    else:
        status = "upcoming"

    home_goals = item["goals"]["home"]
    away_goals = item["goals"]["away"]
    score = f"{home_goals} - {away_goals}" if home_goals is not None and away_goals is not None else None

    return {
        "id": item["fixture"]["id"],
        "sport": "Soccer",
        "league": item["league"]["name"],
        "leagueId": item["league"]["id"],
        "leagueLogo": item["league"].get("logo"),
        "country": item["league"].get("country"),
        "countryFlag": item["league"].get("flag"),
        "homeTeam": item["teams"]["home"]["name"],
        "awayTeam": item["teams"]["away"]["name"],
        "homeLogo": item["teams"]["home"].get("logo"),
        "awayLogo": item["teams"]["away"].get("logo"),
        "matchDate": item["fixture"]["date"],
        "status": status,
        "score": score,
        "elapsed": item["fixture"]["status"].get("elapsed"),
        "venue": item["fixture"].get("venue", {}).get("name"),
    }


async def fetch_fixtures_by_date(date_str: Optional[str] = None) -> list:
    date_str = date_str or date.today().isoformat()
    cache_key = f"fixtures_{date_str}"

    cached = get_cached("fixtures", cache_key)
    if cached:
        return cached

    data = await _api_fetch(f"/fixtures?date={date_str}")
    fixtures = [_map_fixture(item) for item in (data.get("response") or [])]

    # Sort: live first, then upcoming, then finished
    weight = {"live": 3, "upcoming": 2, "finished": 1}
    fixtures.sort(key=lambda f: weight.get(f["status"], 0), reverse=True)

    set_cached("fixtures", cache_key, fixtures)
    return fixtures


async def fetch_fixture_by_id(fixture_id: int) -> Optional[dict]:
    cache_key = f"fixture_{fixture_id}"
    cached = get_cached("fixtures", cache_key)
    if cached:
        return cached

    data = await _api_fetch(f"/fixtures?id={fixture_id}")
    response = data.get("response") or []
    if not response:
        return None

    fixture = _map_fixture(response[0])
    set_cached("fixtures", cache_key, fixture)
    return fixture


async def fetch_standings(league_id: int, season: Optional[int] = None) -> list:
    from datetime import datetime
    current_year = datetime.now().year
    seasons = [season] if season else [current_year - 1, current_year, current_year - 2]

    for s in seasons:
        cache_key = f"standings_{league_id}_{s}"
        cached = get_cached("standings", cache_key)
        if cached:
            return cached

        try:
            data = await _api_fetch(f"/standings?league={league_id}&season={s}")
            response = data.get("response") or []
            if response and response[0].get("league", {}).get("standings"):
                standings = response[0]["league"]["standings"][0]
                set_cached("standings", cache_key, standings)
                return standings
        except Exception:
            continue

    return []


async def fetch_h2h(team1: int, team2: int) -> list:
    cache_key = f"h2h_{team1}_{team2}"
    cached = get_cached("h2h", cache_key)
    if cached:
        return cached

    data = await _api_fetch(f"/fixtures/headtohead?h2h={team1}-{team2}&last=10")
    fixtures = [_map_fixture(item) for item in (data.get("response") or [])]
    set_cached("h2h", cache_key, fixtures)
    return fixtures


async def fetch_live_updates(fixture_ids: list[int]) -> list:
    if not fixture_ids:
        return []
    ids_str = "-".join(str(i) for i in fixture_ids)
    data = await _api_fetch(f"/fixtures?ids={ids_str}")
    return [_map_fixture(item) for item in (data.get("response") or [])]


async def fetch_fixtures_by_league(league_id: int, date_str: Optional[str] = None) -> list:
    date_str = date_str or date.today().isoformat()
    cache_key = f"fixtures_league_{league_id}_{date_str}"

    cached = get_cached("fixtures", cache_key)
    if cached:
        return cached

    data = await _api_fetch(f"/fixtures?date={date_str}&league={league_id}")
    fixtures = [_map_fixture(item) for item in (data.get("response") or [])]
    set_cached("fixtures", cache_key, fixtures)
    return fixtures


async def init_api_quotas():
    """Synchronize API quotas for all configured keys on startup."""
    keys = settings.api_football_key_list
    if not keys:
        return

    logger.info("Initializing API-Football quotas for %d keys", len(keys))
    async with httpx.AsyncClient(timeout=10) as client:
        for key in keys:
            try:
                response = await client.get(
                    f"{API_BASE}/status",
                    headers={"x-apisports-key": key},
                )
                if response.status_code == 200:
                    data = response.json()
                    res = data.get("response", {})
                    req_data = res.get("requests", {})
                    limit_day = req_data.get("limit_day", 100)
                    current = req_data.get("current", 0)
                    
                    entry = _get_key_info(key)
                    entry["limit_day"] = limit_day
                    entry["count"] = current
                    
                    plan = res.get("subscription", {}).get("plan", "Unknown")
                    logger.info(
                        "API-Football key synced: plan=%s, daily_quota=%d/%d",
                        plan, current, limit_day
                    )
                else:
                    logger.warning("Failed to sync API status for key %s...: status %d", key[:8], response.status_code)
                    _mark_key_exhausted(key, f"status_{response.status_code}")
            except Exception as e:
                logger.error("Error syncing API status for key %s: %s", key[:8], str(e))
