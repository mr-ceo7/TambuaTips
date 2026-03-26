import { FixtureData, TeamStanding } from '../types';
import { apiFetch } from './apiRotator';
import { getCached, setCache, CACHE_TTL } from './cache';

// League IDs for API-Football
export const LEAGUES = {
  // Top 6 most popular globally
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png', flag: '🏆' },
  LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png', flag: '🇪🇸' },
  SERIE_A: { id: 135, name: 'Serie A', country: 'Italy', logo: 'https://media.api-sports.io/football/leagues/135.png', flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany', logo: 'https://media.api-sports.io/football/leagues/78.png', flag: '🇩🇪' },
  LIGUE_1: { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png', flag: '🇫🇷' },
  // Other popular European
  EUROPA_LEAGUE: { id: 3, name: 'Europa League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/3.png', flag: '🇪🇺' },
  CONFERENCE_LEAGUE: { id: 848, name: 'Conference League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/848.png', flag: '🇪🇺' },
  CHAMPIONSHIP: { id: 40, name: 'Championship', country: 'England', logo: 'https://media.api-sports.io/football/leagues/40.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  EREDIVISIE: { id: 88, name: 'Eredivisie', country: 'Netherlands', logo: 'https://media.api-sports.io/football/leagues/88.png', flag: '🇳🇱' },
  LIGA_PORTUGAL: { id: 94, name: 'Liga Portugal', country: 'Portugal', logo: 'https://media.api-sports.io/football/leagues/94.png', flag: '🇵🇹' },
  SCOTTISH_PREM: { id: 179, name: 'Scottish Premiership', country: 'Scotland', logo: 'https://media.api-sports.io/football/leagues/179.png', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  // Global hotspots
  SAUDI_PRO: { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', logo: 'https://media.api-sports.io/football/leagues/307.png', flag: '🇸🇦' },
  MLS: { id: 253, name: 'MLS', country: 'USA', logo: 'https://media.api-sports.io/football/leagues/253.png', flag: '🇺🇸' },
  BRASILEIRAO: { id: 71, name: 'Brasileirão', country: 'Brazil', logo: 'https://media.api-sports.io/football/leagues/71.png', flag: '🇧🇷' },
  LIGA_MX: { id: 262, name: 'Liga MX', country: 'Mexico', logo: 'https://media.api-sports.io/football/leagues/262.png', flag: '🇲🇽' },
  // African
  EGYPTIAN_PL: { id: 233, name: 'Egyptian Premier', country: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png', flag: '🇪🇬' },
  SA_PREMIER: { id: 288, name: 'SA Premier', country: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png', flag: '🇿🇦' },
  NIGERIAN_PL: { id: 332, name: 'NPFL', country: 'Nigeria', logo: 'https://media.api-sports.io/football/leagues/332.png', flag: '🇳🇬' },
  KPL: { id: 276, name: 'Kenya Premier League', country: 'Kenya', logo: 'https://media.api-sports.io/football/leagues/276.png', flag: '🇰🇪' },
  TANZANIA_PL: { id: 558, name: 'Tanzania Premier League', country: 'Tanzania', logo: 'https://media.api-sports.io/football/leagues/558.png', flag: '🇹🇿' },
  UGANDA_PL: { id: 566, name: 'Uganda Premier League', country: 'Uganda', logo: 'https://media.api-sports.io/football/leagues/566.png', flag: '🇺🇬' },
} as const;

export const EUROPEAN_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3, 848, 88, 94, 179, 40];
export const AFRICAN_LEAGUE_IDS = [276, 558, 566, 288, 233, 332];
export const OTHER_LEAGUE_IDS = [253, 71, 262, 307];
export const ALL_LEAGUE_IDS = [...EUROPEAN_LEAGUE_IDS, ...AFRICAN_LEAGUE_IDS, ...OTHER_LEAGUE_IDS];

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
