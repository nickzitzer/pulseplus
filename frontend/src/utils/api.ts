import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

let csrfToken: string | null = null;

const createAuthenticatedApi = (): AxiosInstance => {
  const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api`,
    withCredentials: true
  });

  const fetchCsrfToken = async (): Promise<void> => {
    try {
      const response = await axios.get(`${api.defaults.baseURL}/auth/csrf-token`, { withCredentials: true });
      csrfToken = response.data.csrfToken;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  api.interceptors.request.use(async (config) => {
    if (!csrfToken) {
      await fetchCsrfToken();
    }
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  });

  api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;
      if (error.response?.status === 403 && (error.response?.data as { message: string })?.message === 'Invalid CSRF token') {
        await fetchCsrfToken();
        return originalRequest ? api(originalRequest) : Promise.reject(error);
      }
      if (error.response?.status === 401 && originalRequest?.url !== '/auth/refresh-token') {
        try {
          await api.post('/auth/refresh-token');
          return originalRequest ? api(originalRequest) : Promise.reject(error);
        } catch (refreshError) {
          // Handle refresh token failure (e.g., redirect to login)
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
};

const api = createAuthenticatedApi();

export default api;