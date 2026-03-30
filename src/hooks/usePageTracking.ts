import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';

import { useUser } from '../context/UserContext';

export function usePageTracking() {
  const { user } = useUser();
  const location = useLocation();
  const trackingData = useRef<{ path: string; startTime: number } | null>(null);

  useEffect(() => {
    // Report previous page duration when navigating away
    if (trackingData.current) {
      const { path, startTime } = trackingData.current;
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Only report if user spent more than 1 second
      if (timeSpent > 0 && path && user) {
        // We use fetch with keepalive to ensure it fires even if the tab is closing
        // But since this is SPA navigation, normal axios is fine. We will just fire and forget.
        apiClient.post('/auth/activity', { path, time_spent: timeSpent }).catch(() => {});
      }
    }

    // Start timer for new page
    trackingData.current = {
      path: location.pathname + location.search,
      startTime: Date.now()
    };

    // Cleanup when component unmounts
    const handleBeforeUnload = () => {
      if (trackingData.current && user) {
        const { path, startTime } = trackingData.current;
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        if (timeSpent > 0) {
           // We use navigator.sendBeacon ideally, but simple fetch keepalive works too
           const payload = JSON.stringify({ path, time_spent: timeSpent });
           const headers = new Headers();
           headers.append("Content-Type", "application/json");
           
           // Fetch API auth token from localStorage if you can't use apiClient in beforeunload easily
           const tokenResponse = localStorage.getItem('auth_tokens');
           if (tokenResponse) {
             try {
               const { access_token } = JSON.parse(tokenResponse);
               headers.append("Authorization", `Bearer ${access_token}`);
               fetch('/api/auth/activity', {
                 method: 'POST',
                 headers,
                 body: payload,
                 keepalive: true
               });
             } catch(e) {}
           }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, location.search]);
}
