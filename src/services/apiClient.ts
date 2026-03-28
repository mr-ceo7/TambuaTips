import axios from 'axios';

// Get backend URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the access token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tambuatips_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle 401s and token refresh automatically
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('tambuatips_refresh_token');
        if (!refreshToken) {
          // If no refresh token, force logout
          localStorage.removeItem('tambuatips_access_token');
          window.dispatchEvent(new Event('auth:unauthorized'));
          return Promise.reject(error);
        }

        // Try to get a new access token
        const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token, refresh_token } = res.data;
        
        // Save new tokens
        localStorage.setItem('tambuatips_access_token', access_token);
        if (refresh_token) {
          localStorage.setItem('tambuatips_refresh_token', refresh_token);
        }

        // Update original request with new token and retry
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        localStorage.removeItem('tambuatips_access_token');
        localStorage.removeItem('tambuatips_refresh_token');
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
