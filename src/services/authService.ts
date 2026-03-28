import apiClient from './apiClient';
import type { UserData } from '../context/UserContext';

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
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
    };
  },

  logout() {
    localStorage.removeItem('tambuatips_access_token');
    localStorage.removeItem('tambuatips_refresh_token');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
};
