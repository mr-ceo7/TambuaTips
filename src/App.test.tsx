import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';
import * as geminiService from './services/geminiService';
import * as sportsApiService from './services/sportsApiService';

// Mock the services
vi.mock('./services/geminiService', () => ({
  generatePredictions: vi.fn(),
}));

vi.mock('./services/sportsApiService', () => ({
  fetchTodayFixtures: vi.fn(),
  fetchAllTodayFixtures: vi.fn(),
  fetchLiveUpdates: vi.fn(),
  fetchStandings: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sportsApiService.fetchAllTodayFixtures).mockResolvedValue([]);
    vi.mocked(sportsApiService.fetchStandings).mockResolvedValue([]);
  });

  it('renders loading state initially', () => {
    // Return a promise that doesn't resolve immediately
    vi.mocked(sportsApiService.fetchTodayFixtures).mockReturnValue(new Promise(() => {}));
    
    render(<App />);
    expect(screen.getByText(/Analyzing Match Data/i)).toBeInTheDocument();
  });

  it('renders tips when loaded successfully', async () => {
    const mockFixtures = [
      {
        id: 1,
        sport: 'Basketball',
        league: 'NBA',
        homeTeam: 'Lakers',
        awayTeam: 'Warriors',
        matchDate: '2026-03-25T20:00:00Z',
        status: 'upcoming' as const
      }
    ];

    const mockPredictions = [
      {
        fixtureId: 1,
        prediction: 'Over 220.5',
        odds: [{ bookmaker: 'Betika', value: '-110' }],
        confidenceStars: 4,
        reasoning: 'Both teams play fast pace.',
        keyStats: ['Lakers average 115 points', 'Warriors average 118 points'],
        h2h: 'Lakers won 3 of last 5',
        form: { home: 'W-W-W-D-W', away: 'L-D-L-W-L' },
      }
    ];
    
    vi.mocked(sportsApiService.fetchTodayFixtures).mockResolvedValue(mockFixtures);
    vi.mocked(geminiService.generatePredictions).mockResolvedValue(mockPredictions);
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Lakers')).toBeInTheDocument();
      expect(screen.getByText('Warriors')).toBeInTheDocument();
      expect(screen.getByText('Over 220.5')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    vi.mocked(sportsApiService.fetchTodayFixtures).mockRejectedValue(new Error('API Error'));
    
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Loading Intelligence')).toBeInTheDocument();
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });
});
