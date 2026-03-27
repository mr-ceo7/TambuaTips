/**
 * Tips Service — CRUD operations for betting tips stored in localStorage.
 * Supports tip categories (free, 2+, 4+, gg, 10+, vip) and Sportpesa jackpot predictions.
 * To be replaced with a real backend later.
 */

const TIPS_KEY = 'tambuatips_tips';
const JACKPOT_KEY = 'tambuatips_jackpots';

// ─── Tip Types ───────────────────────────────────────────────

export type TipCategory = 'free' | '2+' | '4+' | 'gg' | '10+' | 'vip';

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
  odds: string; // primary/display odds
  bookmaker: string; // primary bookmaker
  bookmakerOdds: BookmakerOdd[]; // odds from multiple bookmakers
  confidence: number; // 1-5
  reasoning: string;
  category: TipCategory;
  isPremium: boolean;
  result: 'pending' | 'won' | 'lost' | 'void';
  createdAt: string;
  updatedAt: string;
}

// ─── Jackpot Types ───────────────────────────────────────────

export type JackpotType = 'midweek' | 'mega';
export type DCLevel = 3 | 4 | 5 | 6 | 7 | 10;

export interface JackpotMatch {
  homeTeam: string;
  awayTeam: string;
  pick: string; // e.g. "1X", "X2", "12"
}

export interface JackpotPrediction {
  id: string;
  type: JackpotType;
  dcLevel: DCLevel;
  matches: JackpotMatch[];
  price: number; // KES
  createdAt: string;
  updatedAt: string;
}

// ─── Tips CRUD ───────────────────────────────────────────────

function loadTips(): Tip[] {
  try {
    const raw = localStorage.getItem(TIPS_KEY);
    if (!raw) {
      const today = new Date().toISOString().split('T')[0];
      const mockTips: Tip[] = [
        {
          id: 'mock-free-1',
          fixtureId: 1001,
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          league: 'Premier League',
          matchDate: `${today}T15:00:00+00:00`,
          prediction: 'Arsenal to Win',
          odds: '2.10',
          bookmaker: 'Betway',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '2.05' },
            { bookmaker: 'SportPesa', odds: '2.12' },
            { bookmaker: 'Betway', odds: '2.10' },
          ],
          confidence: 4,
          reasoning: 'Arsenal is on a 5-match winning streak at home, while Chelsea is struggling with injuries to key defenders.',
          category: 'free',
          isPremium: false,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-4plus-1',
          fixtureId: 1002,
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          league: 'La Liga',
          matchDate: `${today}T20:00:00+00:00`,
          prediction: 'Over 2.5 Goals & BTTS',
          odds: '4.50',
          bookmaker: 'SportPesa',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '4.35' },
            { bookmaker: 'SportPesa', odds: '4.50' },
            { bookmaker: 'Betway', odds: '4.40' },
          ],
          confidence: 4,
          reasoning: 'El Clasico rarely disappoints. Both teams have scored in 8 of their last 10 meetings.',
          category: '4+',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-10plus-1',
          fixtureId: 1003,
          homeTeam: 'Bayern Munich',
          awayTeam: 'Borussia Dortmund',
          league: 'Bundesliga',
          matchDate: `${today}T17:30:00+00:00`,
          prediction: 'Bayern -1.5 AH & Over 3.5',
          odds: '12.00',
          bookmaker: 'Betika',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '12.00' },
            { bookmaker: 'SportPesa', odds: '11.50' },
            { bookmaker: 'Betway', odds: '12.50' },
          ],
          confidence: 3,
          reasoning: 'Bayern historically dominates Der Klassiker at the Allianz Arena, averaging 3.5 goals per game.',
          category: '10+',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-gg-1',
          fixtureId: 1004,
          homeTeam: 'Liverpool',
          awayTeam: 'Man City',
          league: 'Premier League',
          matchDate: `${today}T16:30:00+00:00`,
          prediction: 'Both Teams to Score (GG)',
          odds: '1.65',
          bookmaker: 'Betway',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '1.60' },
            { bookmaker: 'SportPesa', odds: '1.68' },
            { bookmaker: 'Betway', odds: '1.65' },
          ],
          confidence: 5,
          reasoning: 'Both sides have scored in 9 of their last 10 head-to-heads. Expect goals at Anfield.',
          category: 'gg',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-vip-1',
          fixtureId: 1005,
          homeTeam: 'PSG',
          awayTeam: 'Marseille',
          league: 'Ligue 1',
          matchDate: `${today}T20:45:00+00:00`,
          prediction: 'PSG Win, BTTS & Over 3.5',
          odds: '85.00',
          bookmaker: 'Betika',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '85.00' },
            { bookmaker: 'SportPesa', odds: '80.00' },
            { bookmaker: 'Betway', odds: '88.00' },
          ],
          confidence: 3,
          reasoning: 'Le Classique always delivers drama. Accumulator across multiple high-confidence selections.',
          category: 'vip',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-2plus-1',
          fixtureId: 1006,
          homeTeam: 'Napoli',
          awayTeam: 'AC Milan',
          league: 'Serie A',
          matchDate: `${today}T18:00:00+00:00`,
          prediction: 'Napoli or Draw (1X)',
          odds: '2.25',
          bookmaker: 'SportPesa',
          bookmakerOdds: [
            { bookmaker: 'Betika', odds: '2.20' },
            { bookmaker: 'SportPesa', odds: '2.25' },
            { bookmaker: 'Betway', odds: '2.30' },
          ],
          confidence: 4,
          reasoning: 'Napoli is unbeaten at home this season. Milan struggles away from San Siro.',
          category: '2+',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(TIPS_KEY, JSON.stringify(mockTips));
      return mockTips;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTips(tips: Tip[]): void {
  localStorage.setItem(TIPS_KEY, JSON.stringify(tips));
}

export function getAllTips(): Tip[] {
  return loadTips().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTodayTips(): Tip[] {
  const today = new Date().toISOString().split('T')[0];
  return getAllTips().filter(t => t.matchDate.startsWith(today));
}

export function getFreeTips(): Tip[] {
  return getTodayTips().filter(t => t.category === 'free');
}

export function getPremiumTips(): Tip[] {
  return getTodayTips().filter(t => t.category !== 'free');
}

export function getTipsByCategory(category: TipCategory): Tip[] {
  return getTodayTips().filter(t => t.category === category);
}

export function getTipById(id: string): Tip | undefined {
  return loadTips().find(t => t.id === id);
}

export function getTipByFixtureId(fixtureId: number): Tip | undefined {
  return getTodayTips().find(t => t.fixtureId === fixtureId);
}

export function addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'updatedAt'>): Tip {
  const tips = loadTips();
  const newTip: Tip = {
    ...tip,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tips.push(newTip);
  saveTips(tips);
  return newTip;
}

export function updateTip(id: string, updates: Partial<Tip>): Tip | null {
  const tips = loadTips();
  const index = tips.findIndex(t => t.id === id);
  if (index === -1) return null;

  tips[index] = { ...tips[index], ...updates, updatedAt: new Date().toISOString() };
  saveTips(tips);
  return tips[index];
}

export function deleteTip(id: string): boolean {
  const tips = loadTips();
  const filtered = tips.filter(t => t.id !== id);
  if (filtered.length === tips.length) return false;
  saveTips(filtered);
  return true;
}

export function getTipStats(): { total: number; won: number; lost: number; pending: number; voided: number; winRate: number } {
  const tips = loadTips();
  const won = tips.filter(t => t.result === 'won').length;
  const lost = tips.filter(t => t.result === 'lost').length;
  const pending = tips.filter(t => t.result === 'pending').length;
  const voided = tips.filter(t => t.result === 'void').length;
  const decided = won + lost;

  return {
    total: tips.length,
    won,
    lost,
    pending,
    voided,
    winRate: decided > 0 ? Math.round((won / decided) * 100) : 0,
  };
}

// ─── Jackpot CRUD ────────────────────────────────────────────

function loadJackpots(): JackpotPrediction[] {
  try {
    const raw = localStorage.getItem(JACKPOT_KEY);
    if (!raw) {
      const mockJackpots: JackpotPrediction[] = [
        {
          id: 'mock-jp-midweek-3dc',
          type: 'midweek',
          dcLevel: 3,
          price: 500,
          matches: [
            { homeTeam: 'Arsenal', awayTeam: 'Chelsea', pick: '1X' },
            { homeTeam: 'Liverpool', awayTeam: 'Man City', pick: '12' },
            { homeTeam: 'Real Madrid', awayTeam: 'Barcelona', pick: '1X' },
            { homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', pick: '1X' },
            { homeTeam: 'PSG', awayTeam: 'Marseille', pick: '1X' },
            { homeTeam: 'Juventus', awayTeam: 'AC Milan', pick: 'X2' },
            { homeTeam: 'Inter Milan', awayTeam: 'Napoli', pick: '12' },
            { homeTeam: 'Man United', awayTeam: 'Tottenham', pick: 'X2' },
            { homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', pick: '1X' },
            { homeTeam: 'Roma', awayTeam: 'Lazio', pick: '12' },
            { homeTeam: 'Benfica', awayTeam: 'Porto', pick: '1X' },
            { homeTeam: 'Ajax', awayTeam: 'PSV', pick: 'X2' },
            { homeTeam: 'Celtic', awayTeam: 'Rangers', pick: '1X' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-jp-midweek-5dc',
          type: 'midweek',
          dcLevel: 5,
          price: 1000,
          matches: [
            { homeTeam: 'Arsenal', awayTeam: 'Chelsea', pick: '1X' },
            { homeTeam: 'Liverpool', awayTeam: 'Man City', pick: '1X' },
            { homeTeam: 'Real Madrid', awayTeam: 'Barcelona', pick: '12' },
            { homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', pick: '1X' },
            { homeTeam: 'PSG', awayTeam: 'Marseille', pick: '1X' },
            { homeTeam: 'Juventus', awayTeam: 'AC Milan', pick: '1X' },
            { homeTeam: 'Inter Milan', awayTeam: 'Napoli', pick: '1X' },
            { homeTeam: 'Man United', awayTeam: 'Tottenham', pick: 'X2' },
            { homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', pick: '1X' },
            { homeTeam: 'Roma', awayTeam: 'Lazio', pick: '1X' },
            { homeTeam: 'Benfica', awayTeam: 'Porto', pick: '1X' },
            { homeTeam: 'Ajax', awayTeam: 'PSV', pick: '1X' },
            { homeTeam: 'Celtic', awayTeam: 'Rangers', pick: '1X' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-jp-mega-3dc',
          type: 'mega',
          dcLevel: 3,
          price: 800,
          matches: [
            { homeTeam: 'Arsenal', awayTeam: 'Chelsea', pick: '1X' },
            { homeTeam: 'Liverpool', awayTeam: 'Man City', pick: '12' },
            { homeTeam: 'Real Madrid', awayTeam: 'Barcelona', pick: '1X' },
            { homeTeam: 'Bayern Munich', awayTeam: 'Dortmund', pick: '1X' },
            { homeTeam: 'PSG', awayTeam: 'Marseille', pick: '1X' },
            { homeTeam: 'Juventus', awayTeam: 'AC Milan', pick: 'X2' },
            { homeTeam: 'Inter Milan', awayTeam: 'Napoli', pick: '12' },
            { homeTeam: 'Man United', awayTeam: 'Tottenham', pick: 'X2' },
            { homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', pick: '1X' },
            { homeTeam: 'Roma', awayTeam: 'Lazio', pick: '12' },
            { homeTeam: 'Benfica', awayTeam: 'Porto', pick: '1X' },
            { homeTeam: 'Ajax', awayTeam: 'PSV', pick: 'X2' },
            { homeTeam: 'Celtic', awayTeam: 'Rangers', pick: '1X' },
            { homeTeam: 'Gor Mahia', awayTeam: 'AFC Leopards', pick: '1X' },
            { homeTeam: 'Al Ahly', awayTeam: 'Zamalek', pick: '1X' },
            { homeTeam: 'Kaizer Chiefs', awayTeam: 'Orlando Pirates', pick: 'X2' },
            { homeTeam: 'Simba SC', awayTeam: 'Young Africans', pick: '12' },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(JACKPOT_KEY, JSON.stringify(mockJackpots));
      return mockJackpots;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveJackpots(jackpots: JackpotPrediction[]): void {
  localStorage.setItem(JACKPOT_KEY, JSON.stringify(jackpots));
}

export function getAllJackpots(): JackpotPrediction[] {
  return loadJackpots().sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addJackpot(jackpot: Omit<JackpotPrediction, 'id' | 'createdAt' | 'updatedAt'>): JackpotPrediction {
  const jackpots = loadJackpots();
  const newJackpot: JackpotPrediction = {
    ...jackpot,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  jackpots.push(newJackpot);
  saveJackpots(jackpots);
  return newJackpot;
}

export function deleteJackpot(id: string): boolean {
  const jackpots = loadJackpots();
  const filtered = jackpots.filter(j => j.id !== id);
  if (filtered.length === jackpots.length) return false;
  saveJackpots(filtered);
  return true;
}
