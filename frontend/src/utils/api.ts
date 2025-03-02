import axios, { AxiosInstance, AxiosResponse, AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

// Token storage keys
const ACCESS_TOKEN_KEY = 'auth:accessToken';
const REFRESH_TOKEN_KEY = 'auth:refreshToken';

/**
 * Create an authenticated API client for the PulsePlus API
 */
const createAuthenticatedApi = (): AxiosInstance => {
  const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for token refresh
  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      
      // If error is 401 and not from the refresh endpoint
      if (
        error.response?.status === 401 &&
        originalRequest &&
        originalRequest.url !== '/auth/refresh'
      ) {
        try {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          
          if (!refreshToken) {
            // No refresh token, redirect to login
            window.location.href = '/login';
            return Promise.reject(error);
          }
          
          // Try to refresh the token
          const response = await axios.post(
            `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api/auth/refresh`,
            { refresh_token: refreshToken }
          );
          
          const { access_token } = response.data;
          
          // Save the new token
          localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
          
          // Update the failed request with new token and retry
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          
          return axios(originalRequest);
        } catch (refreshError) {
          // Refresh token failed, clear tokens and redirect to login
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );

  return api;
};

// Create and export the API instance
const api = createAuthenticatedApi();

/**
 * Set authentication tokens after login/registration
 */
export const setAuthTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

/**
 * Clear authentication tokens on logout
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

/**
 * Check if user has a stored access token
 */
export const hasAuthTokens = (): boolean => {
  return !!localStorage.getItem(ACCESS_TOKEN_KEY);
};

export default api;