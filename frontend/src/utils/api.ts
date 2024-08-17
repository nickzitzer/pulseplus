import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

const useAuthenticatedApi = () => {
  const { logout, refreshToken } = useAuth();
  const router = useRouter();

  api.interceptors.request.use((config) => {
    const token = Cookies.get('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const newToken = response.headers['x-new-token'];
      if (newToken) {
        Cookies.set('auth_token', newToken, { expires: 7 });
      }
      return response;
    },
    async (error) => {
      if (error.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          Cookies.set('auth_token', newToken, { expires: 7 });
          error.config.headers['Authorization'] = `Bearer ${newToken}`;
          return axios(error.config);
        } catch (refreshError) {
          await logout();
          router.push('/login');
        }
      }
      return Promise.reject(error);
    }
  );

  return api;
};

export default useAuthenticatedApi;