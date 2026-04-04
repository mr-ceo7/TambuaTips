import apiClient from './apiClient';
import type { UserData } from '../context/UserContext';

export interface AuthResponse {
  status: string;
}

export const authService = {
  async googleLogin(idToken: string, referred_by_code?: string): Promise<AuthResponse> {
    const payload: any = { id_token: idToken };
    if (referred_by_code) {
      payload.referred_by_code = referred_by_code;
    }
    const response = await apiClient.post<AuthResponse>('/auth/google', payload);
    return response.data;
  },

  async requestPhoneOtp(phone: string, referred_by_code?: string): Promise<AuthResponse> {
    const payload: any = { phone };
    if (referred_by_code) payload.referred_by_code = referred_by_code;
    const response = await apiClient.post<AuthResponse>('/auth/phone/request-otp', payload);
    return response.data;
  },

  async verifyPhoneOtp(phone: string, code: string, referred_by_code?: string): Promise<AuthResponse> {
    const payload: any = { phone, code };
    if (referred_by_code) payload.referred_by_code = referred_by_code;
    const response = await apiClient.post<AuthResponse>('/auth/phone/verify-otp', payload);
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
      profile_picture: data.profile_picture,
      referral_code: data.referral_code,
      referrals_count: data.referrals_count || 0,
      referral_points: data.referral_points || 0,
      referral_discount_active: data.referral_discount_active || false,
      unlocked_tip_ids: data.unlocked_tip_ids || [],
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
