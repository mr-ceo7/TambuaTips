import { describe, expect, it } from 'vitest';
import { matchesCategoryFilter } from './TipsManagePage';
import type { Tip } from '../../services/tipsService';

const baseTip: Tip = {
  id: '1',
  fixtureId: 1,
  homeTeam: 'Home',
  awayTeam: 'Away',
  league: 'League',
  matchDate: '2026-04-27T12:00:00Z',
  prediction: '1',
  odds: '',
  bookmaker: '',
  bookmakerOdds: [],
  confidence: 3,
  reasoning: '',
  category: '2+',
  isPremium: true,
  isFree: false,
  result: 'pending',
  createdAt: '2026-04-27T10:00:00Z',
  updatedAt: '2026-04-27T10:00:00Z',
};

describe('matchesCategoryFilter', () => {
  it('keeps paid and free category filters strict', () => {
    const paidTwoPlus = { ...baseTip, category: '2+', isFree: false } satisfies Tip;
    const freeTwoPlus = { ...baseTip, id: '2', category: '2+', isPremium: false, isFree: true } satisfies Tip;
    const freeGg = { ...baseTip, id: '3', category: 'gg', isPremium: false, isFree: true } satisfies Tip;

    expect(matchesCategoryFilter(paidTwoPlus, '2+')).toBe(true);
    expect(matchesCategoryFilter(freeTwoPlus, '2+')).toBe(false);
    expect(matchesCategoryFilter(freeTwoPlus, 'free:2+')).toBe(true);
    expect(matchesCategoryFilter(freeGg, 'free:2+')).toBe(false);
    expect(matchesCategoryFilter(freeGg, 'free')).toBe(true);
    expect(matchesCategoryFilter(paidTwoPlus, 'free')).toBe(false);
    expect(matchesCategoryFilter(paidTwoPlus, 'all')).toBe(true);
  });
});
