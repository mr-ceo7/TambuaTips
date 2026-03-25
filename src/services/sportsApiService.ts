import { FixtureData, TeamStanding } from '../types';
import { apiFetch } from './apiRotator';
import { getCached, setCache, CACHE_TTL } from './cache';

// League IDs for API-Football
export const LEAGUES = {
  // European (priority)
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain', flag: '🇪🇸' },
  SERIE_A: { id: 135, name: 'Serie A', country: 'Italy', flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany', flag: '🇩🇪' },
  LIGUE_1: { id: 61, name: 'Ligue 1', country: 'France', flag: '🇫🇷' },
  CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League', country: 'Europe', flag: '🇪🇺' },
  EUROPA_LEAGUE: { id: 3, name: 'Europa League', country: 'Europe', flag: '🇪🇺' },
  // African
  KPL: { id: 276, name: 'Kenya Premier League', country: 'Kenya', flag: '🇰🇪' },
  TANZANIA_PL: { id: 558, name: 'Tanzania Premier League', country: 'Tanzania', flag: '🇹🇿' },
  UGANDA_PL: { id: 566, name: 'Uganda Premier League', country: 'Uganda', flag: '🇺🇬' },
} as const;

export const EUROPEAN_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3];
export const AFRICAN_LEAGUE_IDS = [276, 558, 566];
export const ALL_LEAGUE_IDS = [...EUROPEAN_LEAGUE_IDS, ...AFRICAN_LEAGUE_IDS];

export function getLeagueInfo(leagueId: number) {
  return Object.values(LEAGUES).find(l => l.id === leagueId);
}

function mapApiFixture(item: any): FixtureData {
  const statusShort = item.fixture.status.short;
  let status: 'upcoming' | 'live' | 'finished' = 'upcoming';
  if (['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(statusShort)) status = 'live';
  else if (['FT', 'AET', 'PEN'].includes(statusShort)) status = 'finished';

  const homeGoals = item.goals.home;
  const awayGoals = item.goals.away;
  const score = (homeGoals !== null && awayGoals !== null) ? `${homeGoals} - ${awayGoals}` : undefined;

  return {
    id: item.fixture.id,
    sport: 'Soccer',
    league: item.league.name,
    leagueId: item.league.id,
    leagueLogo: item.league.logo,
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeLogo: item.teams.home.logo,
    awayLogo: item.teams.away.logo,
    matchDate: item.fixture.date,
    status,
    score,
    elapsed: item.fixture.status.elapsed,
    venue: item.fixture.venue?.name,
  };
}

/**
 * Fetch fixtures for a specific date. Defaults to today.
 */
export async function fetchFixturesByDate(date?: string): Promise<FixtureData[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const cacheKey = `fixtures_${dateStr}`;
  
  const cached = getCached<FixtureData[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(`/fixtures?date=${dateStr}`);
  const fixtures = (data.response || []).map(mapApiFixture);
  
  // Sort: live first, then upcoming, then finished
  fixtures.sort((a: FixtureData, b: FixtureData) => {
    const weight = { live: 3, upcoming: 2, finished: 1 };
    return weight[b.status] - weight[a.status];
  });

  setCache(cacheKey, fixtures, CACHE_TTL.FIXTURES);
  return fixtures;
}

/**
 * Fetch today's fixtures (alias for fetchFixturesByDate)
 */
export async function fetchTodayFixtures(): Promise<FixtureData[]> {
  return fetchFixturesByDate();
}

/**
 * Fetch fixtures filtered by major leagues for a date.
 */
export async function fetchAllTodayFixtures(date?: string): Promise<FixtureData[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const cacheKey = `fixtures_major_${dateStr}`;
  
  const cached = getCached<FixtureData[]>(cacheKey);
  if (cached) return cached;

  const leagueIds = EUROPEAN_LEAGUE_IDS.join('-');
  const data = await apiFetch(`/fixtures?date=${dateStr}&league=${leagueIds}`);
  const fixtures = (data.response || []).map(mapApiFixture);

  setCache(cacheKey, fixtures, CACHE_TTL.FIXTURES);
  return fixtures;
}

/**
 * Fetch a single fixture by ID.
 */
export async function fetchFixtureById(fixtureId: number): Promise<FixtureData | null> {
  const cacheKey = `fixture_${fixtureId}`;
  
  const cached = getCached<FixtureData>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(`/fixtures?id=${fixtureId}`);
  if (!data.response || data.response.length === 0) return null;
  
  const fixture = mapApiFixture(data.response[0]);
  setCache(cacheKey, fixture, CACHE_TTL.FIXTURES);
  return fixture;
}

/**
 * Fetch live updates for specific fixture IDs.
 */
export async function fetchLiveUpdates(fixtureIds: number[]): Promise<FixtureData[]> {
  if (fixtureIds.length === 0) return [];
  
  const ids = fixtureIds.join('-');
  const data = await apiFetch(`/fixtures?ids=${ids}`);
  return (data.response || []).map(mapApiFixture);
}

/**
 * Fetch head-to-head between two teams.
 */
export async function fetchH2H(teamId1: number, teamId2: number): Promise<FixtureData[]> {
  const cacheKey = `h2h_${teamId1}_${teamId2}`;
  
  const cached = getCached<FixtureData[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(`/fixtures/headtohead?h2h=${teamId1}-${teamId2}&last=10`);
  const fixtures = (data.response || []).map(mapApiFixture);
  
  setCache(cacheKey, fixtures, CACHE_TTL.H2H);
  return fixtures;
}

/**
 * Fetch league standings.
 */
export async function fetchStandings(leagueId: number, season?: number): Promise<TeamStanding[]> {
  const currentYear = new Date().getFullYear();
  // European leagues use season year = start year (e.g., 2025 for 2025-26 season)
  const seasonsToTry = season ? [season] : [currentYear - 1, currentYear, currentYear - 2];
  
  for (const seasonYear of seasonsToTry) {
    const cacheKey = `standings_${leagueId}_${seasonYear}`;
    
    const cached = getCached<TeamStanding[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const data = await apiFetch(`/standings?league=${leagueId}&season=${seasonYear}`);
      if (data.response && data.response.length > 0 && data.response[0].league?.standings?.[0]) {
        const standings = data.response[0].league.standings[0];
        setCache(cacheKey, standings, CACHE_TTL.STANDINGS);
        return standings;
      }
    } catch {
      continue;
    }
  }
  
  return [];
}

/**
 * Fetch fixtures by league for a date.
 */
export async function fetchFixturesByLeague(leagueId: number, date?: string): Promise<FixtureData[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const cacheKey = `fixtures_league_${leagueId}_${dateStr}`;
  
  const cached = getCached<FixtureData[]>(cacheKey);
  if (cached) return cached;

  const data = await apiFetch(`/fixtures?date=${dateStr}&league=${leagueId}`);
  const fixtures = (data.response || []).map(mapApiFixture);
  
  setCache(cacheKey, fixtures, CACHE_TTL.FIXTURES);
  return fixtures;
}
