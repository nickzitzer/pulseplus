import axios, { AxiosInstance } from 'axios';
import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';
import { getCookie, setCookie } from 'cookies-next';

const api: AxiosInstance = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}/api`,
});

const useAuthenticatedApi = () => {
  const { logout, refreshToken } = useAuth();
  const router = useRouter();

  api.interceptors.request.use((config) => {
    const token = getCookie('auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => {
      const newToken = response.headers['x-new-token'];
      if (newToken) {
        setCookie('auth_token', newToken, { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      }
      return response;
    },
    async (error) => {
      if (error.response?.status === 401) {
        try {
          const newToken = await refreshToken();
          setCookie('auth_token', newToken, { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
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