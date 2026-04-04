import apiClient from './apiClient';

export interface RewardsConfig {
  points_per_tip: number;
  points_per_discount: number;
  discount_percentage: number;
  points_per_premium: number;
  premium_days_reward: number;
}

export const rewardsService = {
  async getConfig(): Promise<RewardsConfig> {
    const response = await apiClient.get<RewardsConfig>('/rewards/config');
    return response.data;
  },

  async redeem(action: 'unlock_tip' | 'get_discount' | 'get_premium', tip_id?: number): Promise<{status: string, message: string, points: number}> {
    const response = await apiClient.post('/rewards/redeem', { action, tip_id });
    return response.data;
  }
};
