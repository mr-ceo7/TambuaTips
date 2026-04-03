"""
API-Football proxy service with server-side key rotation.
Replaces frontend apiRotator.ts + sportsApiService.ts.
"""

import httpx
from typing import Optional, List
from datetime import date

from app.config import settings
from app.services.cache import get_cached, set_cached

API_BASE = "https://v3.football.api-sports.io"
DAILY_LIMIT = 100

# Track usage per key per day (in-memory; resets on server restart)
_key_usage: dict[str, dict] = {}  # {key: {date: str, count: int}}


def _get_today() -> str:
    return date.today().isoformat()


def _get_key_usage(key: str) -> int:
    today = _get_today()
    entry = _key_usage.get(key)
    if not entry or entry.get("date") != today:
        return 0
    return entry.get("count", 0)


def _increment_key(key: str):
    today = _get_today()
    entry = _key_usage.get(key)
    if not entry or entry.get("date") != today:
        _key_usage[key] = {"date": today, "count": 1}
    else:
        entry["count"] = entry.get("count", 0) + 1


def _get_best_key() -> Optional[str]:
    keys = settings.api_football_key_list
    if not keys:
        return None

    today = _get_today()
    best_key = None
    lowest = float("inf")

    for key in keys:
        usage = _get_key_usage(key)
        if usage < DAILY_LIMIT and usage < lowest:
            lowest = usage
            best_key = key

    return best_key


async def _api_fetch(endpoint: str) -> dict:
    """Make a request to API-Football with automatic key rotation."""
    keys = settings.api_football_key_list
    if not keys:
        print("No API-Football keys configured")
        return {}

    today = _get_today()

    # Sort keys by usage (least used first)
    sorted_keys = sorted(keys, key=lambda k: _get_key_usage(k))

    async with httpx.AsyncClient(timeout=30) as client:
        for key in sorted_keys:
            if _get_key_usage(key) >= DAILY_LIMIT:
                continue

            try:
                response = await client.get(
                    f"{API_BASE}{endpoint}",
                    headers={"x-apisports-key": key},
                )
                _increment_key(key)

                data = response.json()

                # Check for API errors (rate limit, suspended, etc.)
                if data.get("errors") and len(data["errors"]) > 0:
                    err_str = str(data["errors"]).lower()
                    if any(w in err_str for w in ["rate", "suspended", "forbidden"]):
                        # Exhaust this key
                        _key_usage[key] = {"date": today, "count": DAILY_LIMIT}
                        continue

                return data

            except Exception:
                continue

    print("ALL_KEYS_EXHAUSTED")
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
