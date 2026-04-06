import apiClient from './apiClient';
import { FixtureData, TeamStanding } from '../types';

export const LEAGUES = {
  PREMIER_LEAGUE: { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  CHAMPIONS_LEAGUE: { id: 2, name: 'Champions League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/2.png', flag: '🏆' },
  LA_LIGA: { id: 140, name: 'La Liga', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png', flag: '🇪🇸' },
  SERIE_A: { id: 135, name: 'Serie A', country: 'Italy', logo: 'https://media.api-sports.io/football/leagues/135.png', flag: '🇮🇹' },
  BUNDESLIGA: { id: 78, name: 'Bundesliga', country: 'Germany', logo: 'https://media.api-sports.io/football/leagues/78.png', flag: '🇩🇪' },
  LIGUE_1: { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png', flag: '🇫🇷' },
  EUROPA_LEAGUE: { id: 3, name: 'Europa League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/3.png', flag: '🇪🇺' },
  CONFERENCE_LEAGUE: { id: 848, name: 'Conference League', country: 'Europe', logo: 'https://media.api-sports.io/football/leagues/848.png', flag: '🇪🇺' },
  CHAMPIONSHIP: { id: 40, name: 'Championship', country: 'England', logo: 'https://media.api-sports.io/football/leagues/40.png', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  EREDIVISIE: { id: 88, name: 'Eredivisie', country: 'Netherlands', logo: 'https://media.api-sports.io/football/leagues/88.png', flag: '🇳🇱' },
  LIGA_PORTUGAL: { id: 94, name: 'Liga Portugal', country: 'Portugal', logo: 'https://media.api-sports.io/football/leagues/94.png', flag: '🇵🇹' },
  SCOTTISH_PREM: { id: 179, name: 'Scottish Premiership', country: 'Scotland', logo: 'https://media.api-sports.io/football/leagues/179.png', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  SAUDI_PRO: { id: 307, name: 'Saudi Pro League', country: 'Saudi Arabia', logo: 'https://media.api-sports.io/football/leagues/307.png', flag: '🇸🇦' },
  MLS: { id: 253, name: 'MLS', country: 'USA', logo: 'https://media.api-sports.io/football/leagues/253.png', flag: '🇺🇸' },
  BRASILEIRAO: { id: 71, name: 'Brasileirão', country: 'Brazil', logo: 'https://media.api-sports.io/football/leagues/71.png', flag: '🇧🇷' },
  LIGA_MX: { id: 262, name: 'Liga MX', country: 'Mexico', logo: 'https://media.api-sports.io/football/leagues/262.png', flag: '🇲🇽' },
  EGYPTIAN_PL: { id: 233, name: 'Egyptian Premier', country: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png', flag: '🇪🇬' },
  SA_PREMIER: { id: 288, name: 'SA Premier', country: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png', flag: '🇿🇦' },
  NIGERIAN_PL: { id: 332, name: 'NPFL', country: 'Nigeria', logo: 'https://media.api-sports.io/football/leagues/332.png', flag: '🇳🇬' },
  KPL: { id: 276, name: 'Kenya Premier League', country: 'Kenya', logo: 'https://media.api-sports.io/football/leagues/276.png', flag: '🇰🇪' },
  TANZANIA_PL: { id: 558, name: 'Tanzania Premier League', country: 'Tanzania', logo: 'https://media.api-sports.io/football/leagues/558.png', flag: '🇹🇿' },
  UGANDA_PL: { id: 566, name: 'Uganda Premier League', country: 'Uganda', logo: 'https://media.api-sports.io/football/leagues/566.png', flag: '🇺🇬' },
} as const;

export const EUROPEAN_LEAGUE_IDS = [39, 140, 135, 78, 61, 2, 3, 848, 88, 94, 179, 40];

// Priority order for default (unfiltered) views — index 0 = highest priority
export const LEAGUE_PRIORITY_ORDER: number[] = [
  39,   // Premier League
  140,  // La Liga
  135,  // Serie A
  78,   // Bundesliga
  61,   // Ligue 1
  71,   // Brasileirão
  262,  // Liga MX
  253,  // MLS
  307,  // Saudi Pro League
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  94,   // Liga Portugal
  88,   // Eredivisie
  144,  // Belgian Pro League
  179,  // Scottish Premiership
  203,  // Turkish Süper Lig
  40,   // Championship
  276,  // Kenya Premier League
  233,  // Egyptian Premier
  288,  // SA Premier
  332,  // NPFL
  558,  // Tanzania Premier League
  566,  // Uganda Premier League
];

export function sortByLeaguePriority(fixtures: FixtureData[]): FixtureData[] {
  return [...fixtures].sort((a, b) => {
    const idxA = LEAGUE_PRIORITY_ORDER.indexOf(a.leagueId);
    const idxB = LEAGUE_PRIORITY_ORDER.indexOf(b.leagueId);
    const prioA = idxA === -1 ? 999 : idxA;
    const prioB = idxB === -1 ? 999 : idxB;
    if (prioA !== prioB) return prioA - prioB;
    // Within same league, live first, then upcoming, then finished
    const statusWeight: Record<string, number> = { live: 3, upcoming: 2, finished: 1 };
    return (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
  });
}

export function getLeagueInfo(leagueId: number) {
  return Object.values(LEAGUES).find(l => l.id === leagueId);
}

export async function fetchFixturesByDate(date?: string): Promise<FixtureData[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const response = await apiClient.get<FixtureData[]>('/sports/fixtures', { params: { date: dateStr } });
  return sortByLeaguePriority(response.data);
}

export async function fetchTodayFixtures(): Promise<FixtureData[]> {
  return fetchFixturesByDate();
}

export async function fetchAllTodayFixtures(date?: string): Promise<FixtureData[]> {
  const all = await fetchFixturesByDate(date);
  return all.filter(f => EUROPEAN_LEAGUE_IDS.includes(f.leagueId));
}

export async function fetchFixtureById(fixtureId: number): Promise<FixtureData | null> {
  try {
    const response = await apiClient.get<FixtureData>(`/sports/fixtures/${fixtureId}`);
    return response.data;
  } catch {
    return null;
  }
}

export async function fetchLiveUpdates(fixtureIds: number[]): Promise<FixtureData[]> {
  if (fixtureIds.length === 0) return [];
  const ids = fixtureIds.join(',');
  const response = await apiClient.get<FixtureData[]>('/sports/live', { params: { ids } });
  return response.data;
}

export async function fetchH2H(teamId1: number, teamId2: number): Promise<FixtureData[]> {
  const response = await apiClient.get<FixtureData[]>('/sports/h2h', { params: { team1: teamId1, team2: teamId2 } });
  return response.data;
}

export async function fetchStandings(leagueId: number, season?: number): Promise<TeamStanding[]> {
  const params: any = {};
  if (season) params.season = season;
  const response = await apiClient.get<TeamStanding[]>(`/sports/standings/${leagueId}`, { params });
  return response.data;
}

export async function fetchFixturesByLeague(leagueId: number, date?: string): Promise<FixtureData[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const response = await apiClient.get<FixtureData[]>('/sports/fixtures', { params: { league: leagueId, date: dateStr } });
  return response.data;
}
