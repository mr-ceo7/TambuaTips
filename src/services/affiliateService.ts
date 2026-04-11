/**
 * Affiliate API service — communicates with the affiliate backend endpoints.
 * Uses a separate axios client to avoid interfering with the main user auth.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const affiliateClient = axios.create({
  baseURL: `${API_BASE_URL}/api/affiliate`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor for affiliate token refresh
affiliateClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute = originalRequest.url?.includes('/login') || originalRequest.url?.includes('/refresh');
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE_URL}/api/affiliate/refresh`, {}, { withCredentials: true });
        return affiliateClient(originalRequest);
      } catch {
        window.dispatchEvent(new Event('affiliate:unauthorized'));
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export const affiliateService = {
  // Auth
  register: (data: { name: string; email: string; password: string; phone: string }) =>
    affiliateClient.post('/register', data),

  login: (data: { email: string; password: string }) =>
    affiliateClient.post('/login', data),

  async googleLogin(idToken: string): Promise<any> {
    const response = await affiliateClient.post('/google', { id_token: idToken });
    return response.data;
  },

  async requestPhoneOtp(phone: string): Promise<any> {
    const response = await affiliateClient.post('/phone/request-otp', { phone });
    return response.data;
  },

  async phoneLogin(phone: string, otp: string): Promise<any> {
    const response = await affiliateClient.post('/phone/verify-otp', { phone, code: otp });
    return response.data;
  },

  logout: () => affiliateClient.post('/logout'),

  refresh: () => affiliateClient.post('/refresh'),

  // Profile
  getMe: () => affiliateClient.get('/me'),

  // Dashboard
  getDashboard: () => affiliateClient.get('/dashboard'),

  // Conversions
  getConversions: (page = 1, limit = 20, type?: string) =>
    affiliateClient.get('/conversions', { params: { page, limit, conversion_type: type } }),

  // Payouts
  getPayouts: (page = 1, limit = 20) =>
    affiliateClient.get('/payouts', { params: { page, limit } }),

  // Team (affiliate admin only)
  getTeam: () => affiliateClient.get('/team'),
  getTeamStats: () => affiliateClient.get('/team/stats'),
};

// Separate client for tracking (no auth needed)
const trackClient = axios.create({
  baseURL: `${API_BASE_URL}/api/affiliate/track`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const affiliateTrackingService = {
  trackClick: (code: string, referrerUrl?: string) =>
    trackClient.post('/click', { code, referrer_url: referrerUrl }),

  validateCode: (code: string) =>
    trackClient.get(`/validate/${code}`),
};

export default affiliateService;
