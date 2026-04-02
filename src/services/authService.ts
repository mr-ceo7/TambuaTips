import apiClient from './apiClient';
import type { UserData } from '../context/UserContext';

export interface AuthResponse {
  status: string;
}

export const authService = {
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      name,
      email,
      password,
    });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/google', {
      id_token: idToken,
    });
    return response.data;
  },

  async verifyEmail(code: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/verify-email', {
      code,
    });
    return response.data;
  },

  async me(): Promise<UserData> {
    const response = await apiClient.get<any>('/auth/me');
    const data = response.data;
    return {
      id: String(data.id),
      username: data.name,
      email: data.email,
      createdAt: data.created_at,
      is_admin: data.is_admin,
      subscription: {
        tier: data.subscription_tier || 'free',
        expiresAt: data.subscription_expires_at || '',
      },
      purchasedJackpotIds: [],
      favorite_teams: data.favorite_teams || [],
    };
  },

  async updateFavorites(teams: string[]): Promise<UserData> {
    const response = await apiClient.put<any>('/auth/me/favorites', {
      favorite_teams: teams,
    });
    return response.data;
  },

  async pushSubscribe(subscription: PushSubscription): Promise<UserData> {
    const jsonSub = subscription.toJSON();
    const response = await apiClient.put<any>('/auth/me/push-subscribe', {
      endpoint: jsonSub.endpoint,
      keys: jsonSub.keys,
    });
    return response.data;
  },

  async toggleMatchSubscription(matchId: number, homeTeam?: string, awayTeam?: string): Promise<{status: string, match_id: number}> {
    const response = await apiClient.post(`/notifications/match/${matchId}/toggle`, {
      home_team: homeTeam,
      away_team: awayTeam
    });
    return response.data;
  },

  async logout() {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // Ignore if already logged out
    }
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
};
