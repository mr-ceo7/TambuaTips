import apiClient from './apiClient';

// ── Types ───────────────────────────────────────────────────

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

export interface DashboardStats {
  users: {
    total_registered: number;
    total_guests: number;
    online_registered: number;
    online_guests: number;
    subscribers_by_tier: Record<string, number>;
    active_subscribers: number;
    conversion_rate: number;
    growth: { date: string; count: number }[];
  };
  revenue: {
    total: number;
    by_method: Record<string, number>;
    today: number;
    this_week: number;
    this_month: number;
    this_year: number;
    trend: { date: string; amount: number }[];
  };
  tips: {
    total: number;
    won: number;
    lost: number;
    pending: number;
    voided: number;
    win_rate: number;
  };
  pages: { path: string; visits: number; total_time: number }[];
  activity_feed: ActivityFeedItem[];
  jackpots: {
    total: number;
    total_purchases: number;
  };
}

export interface ActivityFeedItem {
  type: 'signup' | 'payment';
  user_name: string;
  user_email: string;
  timestamp: string | null;
  amount?: number;
  method?: string;
  status?: string;
  item_type?: string;
}

export interface TransactionFilters {
  status?: string;
  method?: string;
  item_type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  transaction_id: string | null;
  item_type: string;
  item_id: string | null;
  phone: string | null;
  email: string | null;
  created_at: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface UserActivityDetail {
  user: {
    id: number;
    name: string;
    email: string;
    subscription_tier: string;
    subscription_expires_at: string | null;
    is_active: boolean;
    is_admin: boolean;
    country: string | null;
    created_at: string | null;
    last_seen: string | null;
  };
  pages: { path: string; visits: number; total_time: number }[];
  payments: {
    id: number;
    amount: number;
    currency: string;
    method: string;
    status: string;
    item_type: string;
    item_id: string | null;
    reference: string | null;
    created_at: string | null;
  }[];
  total_time_spent: number;
  total_spent: number;
  jackpot_purchases: number;
}

export interface FixtureSearchResult {
  id: number;
  homeTeam: string;
  awayTeam: string;
  league: string;
  leagueId: number;
  matchDate: string;
  status: string;
  homeLogo?: string;
  awayLogo?: string;
  leagueLogo?: string;
}

// ── Service ─────────────────────────────────────────────────

export const adminService = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard');
    return response.data;
  },

  // Users
  getUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  getUserActivity: async (userId: number): Promise<UserActivityDetail> => {
    const response = await apiClient.get<UserActivityDetail>(`/admin/users/${userId}/activity`);
    return response.data;
  },

  revokeSubscription: async (userId: number): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/revoke`);
  },

  toggleUserActive: async (userId: number): Promise<{ is_active: boolean }> => {
    const response = await apiClient.put(`/admin/users/${userId}/toggle-active`);
    return response.data;
  },

  makeAdmin: async (userId: number): Promise<void> => {
    await apiClient.post(`/admin/users/${userId}/make-admin`);
  },

  // Transactions
  getTransactions: async (filters: TransactionFilters = {}): Promise<TransactionsResponse> => {
    const params: Record<string, string | number> = {};
    if (filters.status) params.status = filters.status;
    if (filters.method) params.method = filters.method;
    if (filters.item_type) params.item_type = filters.item_type;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    const response = await apiClient.get<TransactionsResponse>('/admin/transactions', { params });
    return response.data;
  },

  exportTransactionsCSV: (filters: TransactionFilters = {}): string => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.method) params.set('method', filters.method);
    if (filters.item_type) params.set('item_type', filters.item_type);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    const token = localStorage.getItem('tambuatips_access_token');
    // Return the direct URL for download
    const baseUrl = apiClient.defaults.baseURL || '';
    return `${baseUrl}/admin/transactions/export?${params.toString()}&token=${token}`;
  },

  // Fixture search
  searchFixtures: async (query: string, date?: string): Promise<FixtureSearchResult[]> => {
    const params: Record<string, string> = { q: query };
    if (date) params.date = date;
    const response = await apiClient.get('/admin/fixtures/search', { params });
    return response.data.fixtures || [];
  },

  broadcastPush: async (data: {
    title: string;
    body: string;
    url?: string;
    target_tier?: string;
    target_country?: string;
  }): Promise<{ message: string; targeted_users: number; total_subscriptions: number }> => {
    const response = await apiClient.post('/admin/broadcast-push', {
      title: data.title,
      body: data.body,
      url: data.url || '/',
      target_tier: data.target_tier || 'all',
      target_country: data.target_country || 'all',
    });
    return response.data;
  },

  // Ads
  getAds: async (): Promise<AdPost[]> => {
    const response = await apiClient.get<AdPost[]>('/admin/ads');
    return response.data;
  },

  createAd: async (data: Omit<AdPost, 'id' | 'created_at'>): Promise<AdPost> => {
    const response = await apiClient.post<AdPost>('/admin/ads', data);
    return response.data;
  },

  updateAd: async (id: number, data: Partial<AdPost>): Promise<AdPost> => {
    const response = await apiClient.put<AdPost>(`/admin/ads/${id}`, data);
    return response.data;
  },

  deleteAd: async (id: number): Promise<void> => {
    await apiClient.delete(`/admin/ads/${id}`);
  },
};

export interface AdPost {
  id: number;
  title: string;
  image_url: string | null;
  link_url: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
}
