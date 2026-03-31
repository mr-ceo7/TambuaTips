/**
 * Team Logo Service — fetches team badges from TheSportsDB (free, no key).
 * Caches results in localStorage to avoid repeated API calls.
 */

const LOGO_CACHE_KEY = 'tambuatips_team_logos';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface LogoCacheEntry {
  url: string | null;
  fetchedAt: number;
}

type LogoCache = Record<string, LogoCacheEntry>;

function getCache(): LogoCache {
  try {
    const raw = localStorage.getItem(LOGO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache: LogoCache) {
  try {
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage full — evict oldest entries
    const entries = Object.entries(cache).sort((a, b) => a[1].fetchedAt - b[1].fetchedAt);
    const trimmed = Object.fromEntries(entries.slice(Math.floor(entries.length / 2)));
    try { localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify(trimmed)); } catch { /* give up */ }
  }
}

// In-flight dedup: prevent multiple concurrent fetches for the same team
const inflight = new Map<string, Promise<string | null>>();

/**
 * Fetch team badge URL from TheSportsDB.
 * Returns cached result if available, otherwise fetches and caches.
 */
export async function getTeamLogo(teamName: string): Promise<string | null> {
  if (!teamName) return null;

  const key = teamName.trim().toLowerCase();

  // Check cache
  const cache = getCache();
  const entry = cache[key];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.url;
  }

  // Dedup in-flight requests
  if (inflight.has(key)) {
    return inflight.get(key)!;
  }

  const promise = fetchLogo(key, teamName);
  inflight.set(key, promise);

  try {
    const url = await promise;
    // Update cache
    const freshCache = getCache();
    freshCache[key] = { url, fetchedAt: Date.now() };
    setCache(freshCache);
    return url;
  } finally {
    inflight.delete(key);
  }
}

async function fetchLogo(key: string, teamName: string): Promise<string | null> {
  try {
    const encoded = encodeURIComponent(teamName.trim());
    const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encoded}`);
    if (!res.ok) return null;

    const data = await res.json();
    const teams = data.teams;
    if (!teams || teams.length === 0) return null;

    // Try exact match first, then first result
    const exact = teams.find(
      (t: any) => t.strTeam?.toLowerCase() === key || t.strTeamAlternate?.toLowerCase().includes(key)
    );
    const best = exact || teams[0];
    return best.strBadge || best.strTeamBadge || null;
  } catch {
    return null;
  }
}

/**
 * Synchronously get a cached logo URL (no fetch).
 * Returns undefined if not cached, null if cached as not found.
 */
export function getCachedTeamLogo(teamName: string): string | null | undefined {
  if (!teamName) return null;
  const key = teamName.trim().toLowerCase();
  const cache = getCache();
  const entry = cache[key];
  if (entry && Date.now() - entry.fetchedAt < CACHE_TTL_MS) {
    return entry.url;
  }
  return undefined; // not cached
}
