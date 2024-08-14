import { useAuth } from '../context/auth';
import { useMemo } from 'react';
import { useRouter } from 'next/router';

const useAuthenticatedFetch = () => {
  const { user, checkAuthStatus, loading, logout } = useAuth();
  const router = useRouter();

  const fetchWithAuth = useMemo(() => async (endpoint, options = {}) => {
    if (!user || loading) {
      await checkAuthStatus();
    }

    const currentUser = user || JSON.parse(localStorage.getItem('cachedUser'));
    if (!currentUser) {
      router.push('/login');
      throw new Error('User not authenticated');
    }

    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      'X-User-Id': currentUser.sys_id,
    };

    const response = await fetch(`${endpoint}`, {
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
  }, [user, checkAuthStatus, logout, router]);

  return fetchWithAuth;
};

export default useAuthenticatedFetch;