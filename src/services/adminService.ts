import { FixtureData, PredictionData } from '../types';
import apiClient from './apiClient';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  is_active: boolean;
  subscription_tier: string;
  is_subscription_active: boolean;
  subscription_expires_at: string | null;
  country: string | null;
  created_at: string;
  last_seen: string | null;
  most_visited_page: string | null;
  total_time_spent: number;
  is_online: boolean;
}

export const adminService = {
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  },
  
  revokeSubscription: async (userId: number): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/revoke`);
  },
  
  toggleUserActive: async (userId: number): Promise<{ is_active: boolean }> => {
    const response = await apiClient.put(`/admin/users/${userId}/toggle-active`);
    return response.data;
  }
};

export async function getAdminPredictions(fixtures: FixtureData[]): Promise<PredictionData[]> {
  // Mocking predictions set by the admin
  return fixtures.map(fixture => {
    // Basic logic to generate some plausible mock data
    const isHomeFav = fixture.homeTeam.length > fixture.awayTeam.length;
    
    return {
      fixtureId: fixture.id,
      prediction: isHomeFav ? 'Home Win' : 'Away Win',
      odds: [
        { bookmaker: 'Betika', value: isHomeFav ? '1.85' : '2.10' },
        { bookmaker: 'SportPesa', value: isHomeFav ? '1.80' : '2.15' },
        { bookmaker: 'Betway', value: isHomeFav ? '1.88' : '2.05' }
      ],
      confidenceStars: isHomeFav ? 4 : 3,
      reasoning: 'Admin prediction based on historical performance and current team form.',
      keyStats: [
        `${fixture.homeTeam} has won 4 of their last 5 home matches.`,
        `${fixture.awayTeam} struggles away from home.`,
        'Head-to-head favors the predicted winner.'
      ],
      h2h: `${fixture.homeTeam} 2 Wins, 1 Draw, ${fixture.awayTeam} 1 Win`,
      form: {
        home: 'W-W-D-W-L',
        away: 'L-D-L-W-L'
      },
      homeStats: {
        avgGoalsScored: 1.8,
        avgGoalsConceded: 0.9,
        cleanSheets: 3
      },
      awayStats: {
        avgGoalsScored: 1.1,
        avgGoalsConceded: 1.5,
        cleanSheets: 1
      }
    };
  });
}
