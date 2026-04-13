import apiClient from './apiClient';

export type TipCategory = 'free'|'2+' | '4+' | 'gg' | '10+' | 'vip';
export type JackpotType = 'midweek' | 'mega';
export type DCLevel = 0 | 3 | 4 | 5 | 6 | 7 | 10 | 99;

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
  isFree: boolean;
  result: 'pending' | 'won' | 'lost' | 'void' | 'postponed';
  createdAt: string;
  updatedAt: string;
}

export interface TipMutationInput extends Partial<Tip> {
  notify?: boolean;
  notify_target?: string;
  notify_channel?: string;
}

export interface JackpotMatch {
  homeTeam: string;
  awayTeam: string;
  result?: string; // won, lost, void — per-match result
  country?: string;
  countryFlag?: string;
  matchDate?: string;
}

export interface JackpotPrediction {
  id: string;
  type: JackpotType;
  dcLevel: DCLevel;
  matches: JackpotMatch[];
  variations: string[][]; // Each inner array is a row of picks
  price: number;
  result: string; // pending, won, lost, void, bonus
  displayDate?: string;
  createdAt: string;
  updatedAt: string;
  currency?: string;
  currency_symbol?: string;
  regional_prices?: Record<string, any>;
  // Locked-only fields
  locked?: boolean;
  match_count?: number;
  variation_count?: number;
}

export interface JackpotBundleInfo {
  locked_count: number;
  original_price: number;
  discounted_price: number;
  discount_pct: number;
  currency: string;
  currency_symbol: string;
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
    isFree: !Boolean(data.is_premium),
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
    matches: Array.isArray(data.matches) ? data.matches : [],
    variations: Array.isArray(data.variations) ? data.variations : [],
    price: data.price,
    result: data.result || 'pending',
    displayDate: data.display_date || undefined,
    createdAt: data.created_at,
    updatedAt: data.created_at,
    currency: data.currency || 'KES',
    currency_symbol: data.currency_symbol || 'KES',
    regional_prices: data.regional_prices || {},
    locked: !!data.locked,
    match_count: data.match_count,
    variation_count: data.variation_count,
  };
}

// ─── Tips Fetching ───────────────────────────────────────────

export async function getAllTips(): Promise<Tip[]> {
  const res = await apiClient.get('/tips', { params: { date: 'all' } });
  return res.data.map(mapTip);
}

export async function getTodayTips(): Promise<Tip[]> {
  const res = await apiClient.get('/tips');
  return res.data.map(mapTip);
}

export async function getFreeTips(): Promise<Tip[]> {
  const res = await apiClient.get('/tips', { params: { is_free: true } });
  return res.data.map(mapTip);
}

export async function getPremiumTips(): Promise<Tip[]> {
  const tips = await getTodayTips();
  return tips.filter(t => t.isPremium);
}

export async function getTipsByCategory(category: TipCategory): Promise<Tip[]> {
  const params: any = { category };
  // Free category should only return free tips; paid categories should exclude free tips
  if (category === 'free') {
    params.is_free = true;
  } else {
    params.is_free = false;
  }
  const res = await apiClient.get('/tips', { params });
  return res.data.map(mapTip);
}

export async function getTipByFixtureId(fixtureId: number): Promise<Tip | null> {
  try {
    const res = await apiClient.get('/tips', { params: { fixture_id: fixtureId } });
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

export async function getTipStats(): Promise<{ total: number; won: number; lost: number; pending: number; voided: number; postponed: number; winRate: number }> {
  try {
    const res = await apiClient.get('/tips/stats');
    return {
      total: res.data.total,
      won: res.data.won,
      lost: res.data.lost,
      pending: res.data.pending,
      voided: res.data.voided,
      postponed: res.data.postponed ?? 0,
      winRate: res.data.win_rate,
    };
  } catch {
    return { total: 0, won: 0, lost: 0, pending: 0, voided: 0, postponed: 0, winRate: 0 };
  }
}

// ─── Tips CRUD ───────────────────────────────────────────────

export async function addTip(tip: TipMutationInput): Promise<Tip | null> {
  try {
    const payload = {
      fixture_id: tip.fixtureId,
      home_team: tip.homeTeam,
      away_team: tip.awayTeam,
      league: tip.league,
      match_date: tip.matchDate,
      prediction: tip.prediction,
      odds: tip.odds,
      bookmaker: tip.bookmaker,
      bookmaker_odds: tip.bookmakerOdds,
      confidence: tip.confidence,
      reasoning: tip.reasoning,
      category: tip.category,
      is_free: tip.isFree,
      notify: tip.notify ?? false,
      notify_target: tip.notify_target ?? 'all',
      notify_channel: tip.notify_channel ?? 'both',
    };
    const res = await apiClient.post('/tips', payload);
    return mapTip(res.data);
  } catch (error) {
    console.error('Failed to add tip:', error);
    return null;
  }
}

export async function updateTip(id: string, updates: Partial<Tip>): Promise<Tip | null> {
  try {
    const payload: any = {};
    if (updates.fixtureId !== undefined) payload.fixture_id = updates.fixtureId;
    if (updates.homeTeam !== undefined) payload.home_team = updates.homeTeam;
    if (updates.awayTeam !== undefined) payload.away_team = updates.awayTeam;
    if (updates.league !== undefined) payload.league = updates.league;
    if (updates.matchDate !== undefined) payload.match_date = updates.matchDate;
    if (updates.prediction !== undefined) payload.prediction = updates.prediction;
    if (updates.odds !== undefined) payload.odds = updates.odds;
    if (updates.bookmaker !== undefined) payload.bookmaker = updates.bookmaker;
    if (updates.bookmakerOdds !== undefined) payload.bookmaker_odds = updates.bookmakerOdds;
    if (updates.confidence !== undefined) payload.confidence = updates.confidence;
    if (updates.reasoning !== undefined) payload.reasoning = updates.reasoning;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.isFree !== undefined) payload.is_free = updates.isFree;
    if (updates.result !== undefined) payload.result = updates.result;

    const res = await apiClient.put(`/tips/${id}`, payload);
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

import { detectUserCountry } from './geoService';

export async function getAllJackpots(): Promise<JackpotPrediction[]> {
  try {
    const country = await detectUserCountry();
    const query = country ? `?country=${country}` : '';
    const res = await apiClient.get(`/jackpots${query}`);
    return res.data.map(mapJackpot);
  } catch {
    return [];
  }
}

export async function getJackpotBundleInfo(): Promise<JackpotBundleInfo | null> {
  try {
    const country = await detectUserCountry();
    const query = country ? `?country=${country}` : '';
    const res = await apiClient.get<JackpotBundleInfo>(`/jackpots/bundle-info${query}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getJackpotById(id: string): Promise<JackpotPrediction | null> {
  try {
    const country = await detectUserCountry();
    const query = country ? `?country=${country}` : '';
    const res = await apiClient.get(`/jackpots/${id}${query}`);
    return mapJackpot(res.data);
  } catch {
    return null;
  }
}

export async function addJackpot(jackpot: any): Promise<JackpotPrediction> {
  const payload = {
    type: jackpot.type,
    dc_level: jackpot.dcLevel,
    price: jackpot.price,
    display_date: jackpot.displayDate || null,
    matches: jackpot.matches,
    variations: jackpot.variations || [],
    regional_prices: jackpot.regional_prices || {},
  };
  const res = await apiClient.post('/jackpots', payload);
  return mapJackpot(res.data);
}

export async function deleteJackpot(id: string): Promise<boolean> {
  await apiClient.delete(`/jackpots/${id}`);
  return true;
}

export async function updateJackpot(id: string, data: any): Promise<JackpotPrediction> {
  const payload: any = {};
  if (data.type !== undefined) payload.type = data.type;
  if (data.dcLevel !== undefined) payload.dc_level = data.dcLevel;
  if (data.price !== undefined) payload.price = data.price;
  if (data.result !== undefined) payload.result = data.result;
  if (data.displayDate !== undefined) payload.display_date = data.displayDate || null;
  if (data.matches !== undefined) payload.matches = data.matches;
  if (data.variations !== undefined) payload.variations = data.variations;
  if (data.regional_prices !== undefined) payload.regional_prices = data.regional_prices;
  const res = await apiClient.put(`/jackpots/${id}`, payload);
  return mapJackpot(res.data);
}
