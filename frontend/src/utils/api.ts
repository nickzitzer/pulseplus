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

  return api;
};

export default useAuthenticatedApi;