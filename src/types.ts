export interface BookmakerOdd {
  bookmaker: string;
  bookmakerLogo?: string;
  value: string;
  market?: string;
  affiliateLink?: string;
}

export interface BetSelection {
  id: string; // Unique ID for the slip item
  fixtureId: number;
  matchName: string; // e.g., "Arsenal vs Chelsea"
  market: string; // e.g., "Home Win", "Over 2.5 Goals"
  selection: string; // The exact pick, e.g., "1", "Over"
  odds: number; // The numeric value of the odds selected
  bookmaker: string; // The bookmaker the odds were picked from
}

export interface FixtureData {
  id: number;
  sport: string;
  league: string;
  leagueId?: number;
  leagueLogo?: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  matchDate: string;
  status: 'upcoming' | 'live' | 'finished';
  score?: string;
  elapsed?: number;
  venue?: string;
}

export interface TeamStats {
  avgGoalsScored: number;
  avgGoalsConceded: number;
  cleanSheets: number;
}

export interface PredictionData {
  fixtureId: number;
  prediction: string;
  odds: BookmakerOdd[];
  confidenceStars: number; // 1 to 5
  reasoning: string;
  keyStats: string[];
  h2h: string;
  form: { home: string; away: string };
  homeStats?: TeamStats;
  awayStats?: TeamStats;
}

export interface TeamStanding {
  rank: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  goalsDiff: number;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
  };
}

export interface MatchTip extends FixtureData, PredictionData {}
