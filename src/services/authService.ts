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
    const response = await apiClient.get<UserData>('/auth/me');
    return response.data;
  },

  logout() {
    localStorage.removeItem('tambuatips_access_token');
    localStorage.removeItem('tambuatips_refresh_token');
    window.dispatchEvent(new Event('auth:unauthorized'));
  }
};
