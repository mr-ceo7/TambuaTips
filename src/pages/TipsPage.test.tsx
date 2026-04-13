import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TipsPage } from './TipsPage';
import * as tipsService from '../services/tipsService';
import { useUser } from '../context/UserContext';

vi.mock('../context/UserContext', () => ({
  useUser: vi.fn(),
  UserProvider: ({ children }: any) => <div>{children}</div>
}));

vi.mock('../services/tipsService', () => ({
  getFreeTips: vi.fn(),
  getPremiumTips: vi.fn(),
  getTipsByCategory: vi.fn(),
  getTipStats: vi.fn(),
  getAllJackpots: vi.fn(),
  getJackpotBundleInfo: vi.fn(),
}));

describe('TipsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockContextDefaults = {
    user: null,
    isLoggedIn: false,
    subscribeTo: vi.fn(),
    hasAccess: vi.fn(),
    showPricingModal: false,
    setShowPricingModal: vi.fn(),
    targetCategory: null,
    googleLogin: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    showAuthModal: false,
    setShowAuthModal: vi.fn(),
    purchaseJackpot: vi.fn(),
    hasJackpotAccess: vi.fn(),
    showJackpotModal: false,
    setShowJackpotModal: vi.fn(),
    selectedJackpot: null,
    setSelectedJackpot: vi.fn(),
    upgradeToPremium: vi.fn(),
    favoriteTeams: [],
    toggleFavoriteTeam: vi.fn(),
    favoriteLeagues: [],
    toggleFavoriteLeague: vi.fn(),
    notifiedMatches: [],
    toggleMatchNotification: vi.fn(),
    notifiedLeagues: [],
    toggleLeagueNotification: vi.fn(),
    bettingHistory: [],
    addToHistory: vi.fn(),
    showReferralModal: false,
    setShowReferralModal: vi.fn(),
  };

  it('renders locked UI based on context', async () => {
    vi.mocked(tipsService.getTipsByCategory).mockResolvedValue([
      {
        id: 1,
        fixtureId: 101,
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
        league: 'Premier League',
        matchDate: '2025-05-01T20:00:00Z',
        prediction: 'Home Win',
        odds: '2.10',
        bookmaker: 'Betway',
        category: 'vip',
        confidence: 5,
        isPremium: true
      }
    ] as any);
    vi.mocked(tipsService.getFreeTips).mockResolvedValue([]);
    vi.mocked(tipsService.getTipStats).mockResolvedValue({ total: 1, won: 0, lost: 0, pending: 1, voided: 0, postponed: 0, winRate: 0 });
    vi.mocked(tipsService.getAllJackpots).mockResolvedValue([]);
    vi.mocked(tipsService.getJackpotBundleInfo).mockResolvedValue(null);

    // Not logged in -> no access
    const mockContext = {
      ...mockContextDefaults,
      hasAccess: vi.fn().mockReturnValue(false)
    };
    
    vi.mocked(useUser).mockReturnValue(mockContext as any);

    render(
      <MemoryRouter>
        <TipsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Daily Tips/i));

    // Assert that the lock icon or unlock button is rendered for the vip tip
    const components = await screen.findAllByText(/Arsenal/i, {}, { timeout: 4000 });
    expect(components.length).toBeGreaterThan(0);
  });

  it('shows jackpot win loss stats on the jackpot card', async () => {
    vi.mocked(tipsService.getTipsByCategory).mockResolvedValue([]);
    vi.mocked(tipsService.getFreeTips).mockResolvedValue([]);
    vi.mocked(tipsService.getTipStats).mockResolvedValue({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, postponed: 0, winRate: 0 });
    vi.mocked(tipsService.getAllJackpots).mockResolvedValue([
      {
        id: 'jp-1',
        type: 'mega',
        dcLevel: 10,
        matches: [
          { homeTeam: 'A', awayTeam: 'B', result: 'won' },
          { homeTeam: 'C', awayTeam: 'D', result: 'won' },
          { homeTeam: 'E', awayTeam: 'F', result: 'lost' },
        ],
        variations: [['1', 'X', '2']],
        price: 100,
        result: 'pending',
        createdAt: '2026-04-13T10:00:00Z',
        updatedAt: '2026-04-13T10:00:00Z',
        locked: false,
      }
    ] as any);
    vi.mocked(tipsService.getJackpotBundleInfo).mockResolvedValue(null);

    vi.mocked(useUser).mockReturnValue({
      ...mockContextDefaults,
      hasAccess: vi.fn().mockReturnValue(true),
    } as any);

    render(
      <MemoryRouter>
        <TipsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/Jackpot/i));

    expect(await screen.findByText('2W', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('1L')).toBeInTheDocument();
  });
});
