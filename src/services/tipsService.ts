import apiClient from './apiClient';

export type TipCategory = 'free' | '2+' | '4+' | 'gg' | '10+' | 'vip';
export type JackpotType = 'midweek' | 'mega';
export type DCLevel = 3 | 4 | 5 | 6 | 7 | 10;

export interface BookmakerOdd {
  bookmaker: string;
  odds: string;
}

export interface Tip {
  id: string;
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchDate: string;
  prediction: string;
  odds: string;
  bookmaker: string;
  bookmakerOdds: BookmakerOdd[];
  confidence: number;
  reasoning: string;
  category: TipCategory;
  isPremium: boolean;
  result: 'pending' | 'won' | 'lost' | 'void';
  createdAt: string;
  updatedAt: string;
}

export interface JackpotMatch {
  homeTeam: string;
  awayTeam: string;
  pick: string;
}

export interface JackpotPrediction {
  id: string;
  type: JackpotType;
  dcLevel: DCLevel;
  matches: JackpotMatch[];
  price: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Mapping Helpers ─────────────────────────────────────────

function mapTip(data: any): Tip {
  return {
    id: String(data.id),
    fixtureId: data.fixture_id,
    homeTeam: data.home_team,
    awayTeam: data.away_team,
    league: data.league,
    matchDate: data.match_date,
    prediction: data.prediction || 'LOCKED',
    odds: data.odds || '🔒',
    bookmaker: data.bookmaker || '',
    bookmakerOdds: data.bookmaker_odds || [],
    confidence: data.confidence || 0,
    reasoning: data.reasoning || '',
    category: data.category,
    isPremium: Boolean(data.is_premium),
    result: data.result,
    createdAt: data.created_at,
    updatedAt: data.created_at || data.created_at,
  };
}

function mapJackpot(data: any): JackpotPrediction {
  return {
    id: String(data.id),
    type: data.type as JackpotType,
    dcLevel: data.dc_level as DCLevel,
    // Provide an empty array if matches are hidden behind premium lock
    matches: Array.isArray(data.matches) ? data.matches : (data.matches ? JSON.parse(data.matches) : []),
    price: data.price,
    createdAt: data.created_at,
    updatedAt: data.created_at,
  };
}

// ─── Tips Fetching ───────────────────────────────────────────

export async function getAllTips(): Promise<Tip[]> {
  const res = await apiClient.get('/tips');
  return res.data.map(mapTip);
}

export async function getTodayTips(): Promise<Tip[]> {
  const dateStr = new Date().toISOString().split('T')[0];
  const res = await apiClient.get(`/tips?date=${dateStr}`);
  return res.data.map(mapTip);
}

export async function getFreeTips(): Promise<Tip[]> {
  const dateStr = new Date().toISOString().split('T')[0];
  const res = await apiClient.get(`/tips?category=free&date=${dateStr}`);
  return res.data.map(mapTip);
}

export async function getPremiumTips(): Promise<Tip[]> {
  const tips = await getTodayTips();
  return tips.filter(t => t.category !== 'free');
}

export async function getTipsByCategory(category: TipCategory): Promise<Tip[]> {
  const dateStr = new Date().toISOString().split('T')[0];
  const res = await apiClient.get(`/tips?category=${category}&date=${dateStr}`);
  return res.data.map(mapTip);
}

export async function getTipByFixtureId(fixtureId: number): Promise<Tip | null> {
  try {
    const res = await apiClient.get(`/tips?fixture_id=${fixtureId}`);
    if (res.data && res.data.length > 0) {
      return mapTip(res.data[0]);
    }
    return null;
  } catch {
    return null;
  }
}

export async function getTipById(id: string): Promise<Tip | null> {
  try {
    const res = await apiClient.get(`/tips/${id}`);
    return mapTip(res.data);
  } catch {
    return null;
  }
}

export async function getTipStats(): Promise<{ total: number; won: number; lost: number; pending: number; voided: number; winRate: number }> {
  try {
    const res = await apiClient.get('/tips/stats');
    return {
      total: res.data.total,
      won: res.data.won,
      lost: res.data.lost,
      pending: res.data.pending,
      voided: res.data.voided,
      winRate: res.data.win_rate,
    };
  } catch {
    return { total: 0, won: 0, lost: 0, pending: 0, voided: 0, winRate: 0 };
  }
}

// ─── Jackpots Fetching ───────────────────────────────────────

export async function addTip(tip: Partial<Tip>): Promise<Tip | null> {
  try {
    const res = await apiClient.post('/tips', tip);
    return mapTip(res.data);
  } catch (error) {
    console.error('Failed to add tip:', error);
    return null;
  }
}

export async function updateTip(id: string, updates: Partial<Tip>): Promise<Tip | null> {
  try {
    const res = await apiClient.put(`/tips/${id}`, updates);
    return mapTip(res.data);
  } catch (error) {
    console.error('Failed to update tip:', error);
    return null;
  }
}

export async function deleteTip(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/tips/${id}`);
    return true;
  } catch (error) {
    console.error('Failed to delete tip:', error);
    return false;
  }
}

// ─── Jackpots Fetching ───────────────────────────────────────

export async function getAllJackpots(): Promise<JackpotPrediction[]> {
  try {
    const res = await apiClient.get('/jackpots');
    return res.data.map(mapJackpot);
  } catch {
    return [];
  }
}

export async function getJackpotById(id: string): Promise<JackpotPrediction | null> {
  try {
    const res = await apiClient.get(`/jackpots/${id}`);
    return mapJackpot(res.data);
  } catch {
    return null;
  }
}

export async function addJackpot(jackpot: any): Promise<JackpotPrediction> {
  throw new Error("addJackpot must be called via backend Admin API");
}

export async function deleteJackpot(id: string): Promise<boolean> {
  throw new Error("deleteJackpot must be called via backend Admin API");
}
