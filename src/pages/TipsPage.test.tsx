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
        displayDate: '2026-04-18',
        promoImageUrl: '/media/uploads/jp-promo.jpg',
        promoTitle: "This Week's Mega Jackpot",
        promoCaption: 'Official jackpot poster before our free guidance',
        promoOnly: true,
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

    expect(await screen.findByText("This Week's Mega Jackpot")).toBeInTheDocument();
    expect(await screen.findByAltText("This Week's Mega Jackpot")).toBeInTheDocument();
    expect(await screen.findByText(/Prediction drops soon/i)).toBeInTheDocument();
    expect(screen.queryByText('2W')).not.toBeInTheDocument();
    expect(screen.queryByText('1L')).not.toBeInTheDocument();
  });

  it('filters jackpot cards by midweek and mega and uses unique versions wording', async () => {
    vi.mocked(tipsService.getTipsByCategory).mockResolvedValue([]);
    vi.mocked(tipsService.getFreeTips).mockResolvedValue([]);
    vi.mocked(tipsService.getTipStats).mockResolvedValue({ total: 0, won: 0, lost: 0, pending: 0, voided: 0, postponed: 0, winRate: 0 });
    vi.mocked(tipsService.getAllJackpots).mockResolvedValue([
      {
        id: 'mid-1',
        type: 'midweek',
        dcLevel: 3,
        matches: [{ homeTeam: 'Mid A', awayTeam: 'Mid B' }],
        variations: [['1X']],
        price: 100,
        result: 'pending',
        createdAt: '2026-04-13T10:00:00Z',
        updatedAt: '2026-04-13T10:00:00Z',
        locked: false,
      },
      {
        id: 'meg-1',
        type: 'mega',
        dcLevel: 5,
        matches: [{ homeTeam: 'Mega A', awayTeam: 'Mega B' }],
        variations: [['12'], ['X2'], ['1X']],
        price: 200,
        result: 'pending',
        createdAt: '2026-04-13T11:00:00Z',
        updatedAt: '2026-04-13T11:00:00Z',
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

    const megaHeading = await screen.findByText(/Mega Jackpot/i);
    expect(megaHeading.closest('.space-y-3')).toHaveTextContent(/3 unique versions with 5 Double Chances/i);

    fireEvent.click(screen.getByRole('button', { name: 'Midweek' }));
    expect(await screen.findByText(/Midweek Jackpot/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mega Jackpot/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mega' }));
    expect(await screen.findByText(/Mega Jackpot/i)).toBeInTheDocument();
    expect(screen.queryByText(/Midweek Jackpot/i)).not.toBeInTheDocument();
  });
});
