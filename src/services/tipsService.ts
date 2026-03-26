/**
 * Tips Service — CRUD operations for betting tips stored in localStorage.
 * To be replaced with a real backend later.
 */

const STORAGE_KEY = 'tambuatips_tips';

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
  confidence: number; // 1-5
  reasoning: string;
  isPremium: boolean;
  result: 'pending' | 'won' | 'lost' | 'void';
  createdAt: string;
  updatedAt: string;
}

function loadTips(): Tip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Generate mock tips for testing payment and premium features
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
          confidence: 4,
          reasoning: 'Arsenal is on a 5-match winning streak at home, while Chelsea is struggling with injuries to key defenders.',
          isPremium: false,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-prem-1',
          fixtureId: 1002,
          homeTeam: 'Real Madrid',
          awayTeam: 'Barcelona',
          league: 'La Liga',
          matchDate: `${today}T20:00:00+00:00`,
          prediction: 'Over 2.5 Goals & BTTS',
          odds: '1.85',
          bookmaker: 'SportPesa',
          confidence: 5,
          reasoning: 'El Clasico rarely disappoints. Both teams have scored in 8 of their last 10 meetings, and both boast fully fit attacking trios.',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'mock-prem-2',
          fixtureId: 1003,
          homeTeam: 'Bayern Munich',
          awayTeam: 'Borussia Dortmund',
          league: 'Bundesliga',
          matchDate: `${today}T17:30:00+00:00`,
          prediction: 'Bayern -1.5 Asian Handicap',
          odds: '2.30',
          bookmaker: 'Betika',
          confidence: 5,
          reasoning: 'Bayern historically dominates Der Klassiker at the Allianz Arena, averaging 3.5 goals per game against Dortmund in the last 5 years.',
          isPremium: true,
          result: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockTips));
      return mockTips;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveTips(tips: Tip[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tips));
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
  return getTodayTips().filter(t => !t.isPremium);
}

export function getPremiumTips(): Tip[] {
  return getTodayTips().filter(t => t.isPremium);
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
