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
  },
  
  trackCampaignClick: async (slug: string): Promise<void> => {
    try {
      await apiClient.post(`/campaigns/${slug}/click`);
    } catch (error) {
      // Silently fail for analytics to not disrupt user experience
      console.warn('Failed to track campaign click', error);
    }
  }
};
