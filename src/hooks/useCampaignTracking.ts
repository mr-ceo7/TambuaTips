import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { campaignService } from '../services/campaignService';

export function useCampaignTracking() {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    // Check for `campaign` or `c` parameter
    const slug = searchParams.get('campaign') || searchParams.get('c');
    
    if (slug) {
      // Check if we already tracked this campaign in this session to prevent spam clicks on page reloads
      const trackedKey = `tracked_campaign_${slug}`;
      if (!sessionStorage.getItem(trackedKey)) {
        campaignService.trackCampaignClick(slug);
        sessionStorage.setItem(trackedKey, 'true');
      }
    }
  }, [location.search, searchParams]);
}
