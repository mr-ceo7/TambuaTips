import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import apiClient from '../services/apiClient';

import { useUser } from '../context/UserContext';

export function usePageTracking() {
  const { user } = useUser();
  const location = useLocation();
  const trackingData = useRef<{ path: string; startTime: number } | null>(null);

  useEffect(() => {
    // Generate or retrieve anonymous session ID
    let sessionId = localStorage.getItem('tambua_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
      localStorage.setItem('tambua_session_id', sessionId);
    }

    // Report previous page duration when navigating away
    if (trackingData.current) {
      const { path, startTime } = trackingData.current;
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      
      // Only report if user spent more than 1 second
      if (timeSpent > 0 && path) {
        apiClient.post('/auth/activity', { path, time_spent: timeSpent, session_id: sessionId }).catch(() => {});
      }
    }

    // Start timer for new page
    trackingData.current = {
      path: location.pathname + location.search,
      startTime: Date.now()
    };

    // Heartbeat: report activity every 2.5 minutes to keep "online" status accurate
    // We send time_spent = 0 so the backend ONLY updates last_seen but doesn't create duplicate activity DB rows.
    const heartbeatInterval = setInterval(() => {
        // Lightweight fire and forget ping
        apiClient.post('/auth/activity', { path: location.pathname, time_spent: 0, session_id: sessionId }).catch(() => {});
    }, 150_000); // 2.5 minutes

    // Cleanup when component unmounts
    const handleBeforeUnload = () => {
      if (trackingData.current) {
        const { path, startTime } = trackingData.current;
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        if (timeSpent > 0) {
           const payload = JSON.stringify({ path, time_spent: timeSpent, session_id: sessionId });
           const headers = new Headers();
           headers.append("Content-Type", "application/json");
           
           const tokenResponse = localStorage.getItem('auth_tokens');
           if (tokenResponse) {
             try {
               const { access_token } = JSON.parse(tokenResponse);
               headers.append("Authorization", `Bearer ${access_token}`);
             } catch(e) {}
           }
           
           fetch('/api/auth/activity', {
             method: 'POST',
             headers,
             body: payload,
             keepalive: true
           }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, location.search, user]);
}
