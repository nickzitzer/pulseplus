import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const useAuthenticatedApi = () => {
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

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token'); // Or however you're storing the token
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, { ...options, headers });
    // ... handle response
  };

  return api;
};

export default useAuthenticatedApi;