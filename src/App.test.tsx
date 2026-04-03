import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as sportsApiService from './services/sportsApiService';

// Mock the services
vi.mock('./services/geminiService', () => ({
  generatePredictions: vi.fn(),
}));

vi.mock('./services/sportsApiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/sportsApiService')>();
  return {
    ...actual,
    fetchTodayFixtures: vi.fn().mockResolvedValue([]),
    fetchAllTodayFixtures: vi.fn().mockResolvedValue([]),
    fetchLiveUpdates: vi.fn().mockResolvedValue([]),
    fetchStandings: vi.fn().mockResolvedValue([]),
  };
});

// Mock context providers that need external dependencies
vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: any) => <div>{children}</div>,
  useGoogleOneTapLogin: vi.fn(),
}));

vi.mock('./services/authService', () => ({
  authService: {
    me: vi.fn().mockRejectedValue(new Error('not logged in')),
    logout: vi.fn(),
    googleLogin: vi.fn(),
  },
}));

vi.mock('./context/UserContext', () => ({
  useUser: vi.fn().mockReturnValue({
    user: null,
    isLoggedIn: false,
    subscribeTo: vi.fn(),
    hasAccess: vi.fn().mockReturnValue(true),
    showPricingModal: false,
    setShowPricingModal: vi.fn(),
    targetCategory: null,
    googleLogin: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
    showAuthModal: false,
    setShowAuthModal: vi.fn(),
    purchaseJackpot: vi.fn(),
    hasJackpotAccess: vi.fn().mockReturnValue(false),
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
  }),
  UserProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    render(<App />);
    // The app should mount and render the brand name somewhere  
    await waitFor(() => {
      expect(screen.getAllByText(/TAMBUA/i).length).toBeGreaterThan(0);
    });
  });
});
