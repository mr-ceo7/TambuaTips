import apiClient from './apiClient';

// ── Types ───────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  is_admin: boolean;
  is_active: boolean;
  subscription_tier: string;
  is_subscription_active: boolean;
  subscription_expires_at: string | null;
  sms_tips_enabled: boolean;
  country: string | null;
  created_at: string;
  last_seen: string | null;
  most_visited_page: string | null;
  total_time_spent: number;
  is_online: boolean;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  counts: Record<string, number>;
}

export interface AdminUsersFilters {
  search?: string;
  tier?: string;
  sort_field?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface BulkGrantUsersResponse {
  status: string;
  tier: string;
  duration_days: number;
  updated: number;
  processed: number;
  updated_user_ids: number[];
}

export interface BulkUserUpdateResponse {
  status: string;
  action: string;
  tier: string | null;
  duration_days: number | null;
  updated: number;
  processed: number;
  skipped: number;
  updated_user_ids: number[];
  skipped_user_ids: number[];
}

export interface DashboardStats {
  users: {
    total_registered: number;
    total_guests: number;
    online_registered: number;
    online_guests: number;
    today_registered: number;
    today_guests: number;
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

export interface ReferralSettings {
  referral_enabled?: boolean;
  points_per_tip?: number;
  points_per_discount?: number;
  discount_percentage?: number;
  points_per_premium?: number;
  premium_days_reward?: number;
  referral_new_user_reward?: boolean;
  referral_new_user_reward_tier?: string;
  referral_new_user_reward_days?: number;
  jackpot_midweek_price?: number;
  jackpot_mega_price?: number;
  jackpot_midweek_int_price?: number;
  jackpot_mega_int_price?: number;
  jackpot_history_retention_days?: number;
  jackpot_bundle_discount?: number;
  jackpot_prices_json?: string;
}

export interface SMSSettings {
  SMS_SRC: string;
  SMS_ENABLED: boolean;
  SMS_TEMPLATE: string;
}

export interface SmsOnboardResponse {
  status: string;
  created: boolean;
  user_id: number;
  tier: string;
  expires_at: string | null;
  sms_tips_enabled: boolean;
}

export interface EmailSettings {
  SMTP_EMAIL: string;
  SMTP_PASSWORD: string;
}

export interface SupportSettings {
  SUPPORT_EMAIL: string;
  SUPPORT_WHATSAPP: string;
  SUPPORT_WHATSAPP_NUMBER: string;
}

export interface ReferralStatsResponse {
  total_referrals: number;
  referred_users: number;
  total_tips_unlocked: number;
  total_discounts_claimed: number;
  top_referrers: {
    id: number;
    name: string;
    email: string;
    referrals_count: number;
    referral_code: string;
  }[];
  settings: ReferralSettings;
}

export interface LegacyMpesaQueueItem {
  id: number;
  source_record_id: number;
  biz_no: string | null;
  phone: string;
  first_name: string | null;
  other_name: string | null;
  amount: number;
  paid_at: string | null;
  user_id: number | null;
  user_name: string | null;
  user_subscription_tier: string | null;
  payment_id: number | null;
  onboarding_status: string;
  assigned_tier: string | null;
  assigned_duration_days: number | null;
  assigned_at: string | null;
}

export interface LegacyMpesaQueueResponse {
  items: LegacyMpesaQueueItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ── Service ─────────────────────────────────────────────────

export const adminService = {
  // Dashboard
  getDashboardStats: async (days: number = 30): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard', { params: { days } });
    return response.data;
  },

  clearDashboardStats: async (): Promise<{ status: string, message: string }> => {
    const response = await apiClient.delete('/admin/dashboard/clear');
    return response.data;
  },

  // Users
  getUsers: async (filters: AdminUsersFilters = {}): Promise<AdminUsersResponse> => {
    const params: Record<string, string | number> = {};
    if (filters.search) params.search = filters.search;
    if (filters.tier) params.tier = filters.tier;
    if (filters.sort_field) params.sort_field = filters.sort_field;
    if (filters.sort_dir) params.sort_dir = filters.sort_dir;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    const response = await apiClient.get<AdminUsersResponse>('/admin/users', { params });
    return response.data;
  },

  getUserActivity: async (userId: number): Promise<UserActivityDetail> => {
    const response = await apiClient.get<UserActivityDetail>(`/admin/users/${userId}/activity`);
    return response.data;
  },

  revokeSubscription: async (userId: number): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/revoke`);
  },

  grantSubscription: async (userId: number, tier: string, durationDays: number): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/grant-subscription`, {
      tier,
      duration_days: durationDays,
    });
  },

  bulkGrantSubscription: async (
    tier: string,
    durationDays: number,
    userIds: number[] = [],
    applyToFiltered: boolean = false,
    filters: Pick<AdminUsersFilters, 'search' | 'tier'> = {},
  ): Promise<BulkGrantUsersResponse> => {
    const response = await apiClient.put<BulkGrantUsersResponse>('/admin/users/grant-subscription/bulk', {
      tier,
      duration_days: durationDays,
      user_ids: userIds,
      apply_to_filtered: applyToFiltered,
      search: filters.search,
      filter_tier: filters.tier || 'all',
    });
    return response.data;
  },

  bulkUpdateUsers: async ({
    action,
    userIds = [],
    applyToFiltered = false,
    filters = {},
    tier,
    durationDays,
  }: {
    action: string;
    userIds?: number[];
    applyToFiltered?: boolean;
    filters?: Pick<AdminUsersFilters, 'search' | 'tier'>;
    tier?: string;
    durationDays?: number;
  }): Promise<BulkUserUpdateResponse> => {
    const response = await apiClient.put<BulkUserUpdateResponse>('/admin/users/bulk-update', {
      action,
      user_ids: userIds,
      apply_to_filtered: applyToFiltered,
      search: filters.search,
      filter_tier: filters.tier || 'all',
      tier,
      duration_days: durationDays,
    });
    return response.data;
  },

  onboardSmsUser: async (phone: string, tier: string, durationDays: number, amountPaid: number): Promise<SmsOnboardResponse> => {
    const response = await apiClient.post<SmsOnboardResponse>('/admin/users/onboard-sms', {
      phone,
      tier,
      duration_days: durationDays,
      amount_paid: amountPaid,
    });
    return response.data;
  },

  syncLegacyMpesa: async (): Promise<{ status: string; fetched: number; imported: number; created_users: number; linked_existing_users: number; skipped: number }> => {
    const response = await apiClient.post('/admin/legacy-mpesa/sync');
    return response.data;
  },

  backfillLegacyMpesa: async (): Promise<{ status: string; mode: string; fetched: number; imported: number; created_users: number; linked_existing_users: number; skipped: number }> => {
    const response = await apiClient.post('/admin/legacy-mpesa/backfill');
    return response.data;
  },

  importLegacyMpesaDateRange: async (dateFrom: string, dateTo: string): Promise<{
    status: string;
    mode: string;
    date_from: string;
    date_to: string;
    fetched: number;
    imported: number;
    created_users: number;
    linked_existing_users: number;
    skipped: number;
  }> => {
    const response = await apiClient.post('/admin/legacy-mpesa/import-range', {
      date_from: dateFrom,
      date_to: dateTo,
    });
    return response.data;
  },

  getLegacyMpesaQueue: async (statusFilter: string = 'pending_assignment', page: number = 1, perPage: number = 20): Promise<LegacyMpesaQueueResponse> => {
    const response = await apiClient.get<LegacyMpesaQueueResponse>('/admin/legacy-mpesa/queue', {
      params: {
        status_filter: statusFilter,
        page,
        per_page: perPage,
      },
    });
    return response.data;
  },

  assignLegacyMpesa: async (queueId: number, tier: string, durationDays: number): Promise<{ status: string; queue_id: number; user_id: number; payment_id: number; tier: string; expires_at: string | null }> => {
    const response = await apiClient.post(`/admin/legacy-mpesa/${queueId}/assign`, {
      tier,
      duration_days: durationDays,
    });
    return response.data;
  },

  bulkAssignLegacyMpesa: async (
    tier: string,
    durationDays: number,
    queueIds: number[] = [],
    applyToAllPending: boolean = false,
  ): Promise<{
    status: string;
    tier: string;
    duration_days: number;
    assigned: number;
    skipped: number;
    processed: number;
    assigned_queue_ids: number[];
  }> => {
    const response = await apiClient.post('/admin/legacy-mpesa/assign-bulk', {
      tier,
      duration_days: durationDays,
      queue_ids: queueIds,
      apply_to_all_pending: applyToAllPending,
    });
    return response.data;
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

  enrichMatches: async (matches: { homeTeam: string, awayTeam: string, country?: string, countryFlag?: string }[]): Promise<{ homeTeam: string, awayTeam: string, country?: string, countryFlag?: string }[]> => {
    const response = await apiClient.post('/admin/fixtures/enrich', { matches });
    return response.data.matches || [];
  },

  broadcastPush: async (data: {
    title: string;
    body: string;
    url?: string;
    target_tier?: string;
    target_country?: string;
    target_users?: string;
    delivery_method?: string;
  }): Promise<{ message: string; targeted_users: number; total_subscriptions: number; emails_sent: number }> => {
    const response = await apiClient.post('/admin/broadcast-push', {
      title: data.title,
      body: data.body,
      url: data.url || '/',
      target_tier: data.target_tier || 'all',
      target_country: data.target_country || 'all',
      target_users: data.target_users || '',
      delivery_method: data.delivery_method || 'both',
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

  // ── Campaigns ───────────────────────────────────────────────
  getCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>('/campaigns');
    return response.data;
  },

  createCampaign: async (data: Omit<Campaign, 'id' | 'created_at'>): Promise<Campaign> => {
    const response = await apiClient.post<Campaign>('/campaigns', data);
    return response.data;
  },

  updateCampaign: async (id: number, data: Partial<Campaign>): Promise<Campaign> => {
    const response = await apiClient.put<Campaign>(`/campaigns/${id}`, data);
    return response.data;
  },

  deleteCampaign: async (id: number): Promise<void> => {
    await apiClient.delete(`/campaigns/${id}`);
  },

  // ── Settings ────────────────────────────────────────────────
  async getSettings(): Promise<ReferralSettings> {
    const response = await apiClient.get('/admin/settings');
    return response.data;
  },

  async updateSettings(data: Partial<ReferralSettings>): Promise<ReferralSettings> {
    const response = await apiClient.put('/admin/settings', data);
    return response.data;
  },

  // ── Referral Analytics ─────────────────────────────────────
  async getReferralStats(): Promise<ReferralStatsResponse> {
    const response = await apiClient.get('/admin/referral-stats');
    return response.data;
  },

  // ── SMS Settings ────────────────────────────────────────────
  async getSmsSettings(): Promise<SMSSettings> {
    const response = await apiClient.get('/admin/settings/sms');
    return response.data;
  },

  async updateSmsSettings(data: Partial<SMSSettings>): Promise<SMSSettings> {
    const response = await apiClient.put('/admin/settings/sms', data);
    return response.data;
  },

  getEmailSettings: async (): Promise<EmailSettings> => {
    const response = await apiClient.get('/admin/settings/email');
    return response.data;
  },

  updateEmailSettings: async (settings: EmailSettings): Promise<{ message: string }> => {
    const response = await apiClient.put('/admin/settings/email', settings);
    return response.data;
  },

  getSupportSettings: async (): Promise<SupportSettings> => {
    const response = await apiClient.get<SupportSettings>('/admin/settings/support');
    return response.data;
  },

  updateSupportSettings: async (settings: SupportSettings): Promise<{ message: string }> => {
    const response = await apiClient.put('/admin/settings/support', settings);
    return response.data;
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

export interface Campaign {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  incentive_type: string;
  incentive_value: number;
  asset_video_url: string | null;
  asset_image_url: string | null;
  og_image_url: string | null;
  banner_text: string | null;
  theme_color_hex: string | null;
  use_splash_screen: boolean;
  use_floating_badge: boolean;
  use_particle_effects: boolean;
  use_custom_icons: boolean;
  is_active: boolean;
  created_at: string;
  click_count?: number;
  login_count?: number;
  purchase_count?: number;
  revenue_generated?: number;
}

export async function uploadCampaignAsset(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiClient.post('/campaigns/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.url;
}
