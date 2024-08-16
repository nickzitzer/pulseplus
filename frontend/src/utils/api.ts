import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const useAuthenticatedFetch = () => {
  const { user, logout } = useAuth();
  const router = useRouter();

  api.interceptors.request.use((config) => {
    if (user?.token) {
      config.headers['Authorization'] = `Bearer ${user.token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await logout();
        router.push('/login');
      }
      return Promise.reject(error);
    }
  );

  const authenticatedFetch = async (url: string, options: AxiosRequestConfig = {}) => {
    try {
      const response = await api(url, options);
      return response.data;
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  };

  return authenticatedFetch;
};

export default useAuthenticatedFetch;