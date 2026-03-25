import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MatchCard } from './MatchCard';
import { MatchTip } from '../types';

const mockTip: MatchTip = {
  id: 1,
  fixtureId: 1,
  sport: 'Soccer',
  league: 'Premier League',
  homeTeam: 'Arsenal',
  awayTeam: 'Chelsea',
  matchDate: '2026-03-25T15:00:00Z',
  prediction: 'Home Win',
  odds: [{ bookmaker: 'Betika', value: '2.10' }],
  confidenceStars: 4,
  reasoning: 'Arsenal is in great form at home.',
  keyStats: ['Arsenal has won 5 home games in a row', 'Chelsea has not won away in 3 games'],
  h2h: 'Arsenal won 3 of last 5',
  form: { home: 'W-W-W-D-W', away: 'L-D-L-W-L' },
  status: 'upcoming'
};

describe('MatchCard', () => {
  it('renders match details correctly', () => {
    render(<MatchCard tip={mockTip} />);
    
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
    expect(screen.getByText(/Soccer/i)).toBeInTheDocument();
    expect(screen.getByText(/Premier League/i)).toBeInTheDocument();
    expect(screen.getByText('Home Win')).toBeInTheDocument();
    expect(screen.getByText('2.10')).toBeInTheDocument();
  });

  it('handles missing date gracefully', () => {
    const tipWithoutDate = { ...mockTip, matchDate: '' };
    render(<MatchCard tip={tipWithoutDate} />);
    expect(screen.getByText('TBD')).toBeInTheDocument();
  });
});

