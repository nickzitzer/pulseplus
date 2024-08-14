import { useAuth } from '../context/auth';
import { useRouter } from 'next/router';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const useAuthenticatedFetch = () => {
  const { user, checkAuthStatus, logout } = useAuth();
  const router = useRouter();

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    if (!user) {
      await checkAuthStatus();
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (user?.token) {
      headers.set('Authorization', `Bearer ${user.token}`);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        await logout();
        router.push('/login');
        throw new Error('Session expired. Please log in again.');
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  };

  return fetchWithAuth;
};

export default useAuthenticatedFetch;