import apiClient from './apiClient';
import type { Campaign } from './adminService';

export const campaignService = {
  getActiveCampaign: async (): Promise<Campaign | null> => {
    try {
      const response = await apiClient.get<Campaign>('/campaigns/active');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
};
