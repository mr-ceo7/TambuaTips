import axios from 'axios';

// Get backend URL from environment or use default
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to handle 401s and token refresh automatically
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If session uniquely expired because of device login
    const detailMsg = error.response?.data?.detail;
    if (error.response?.status === 401 && detailMsg === "Session expired. Device logged in elsewhere.") {
      window.dispatchEvent(new Event('auth:conflict'));
      return Promise.reject(error);
    }
    
    // If error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      try {
        // Try to get a new access token via HttpOnly cookies
        await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, { withCredentials: true });
        
        // Retry original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
