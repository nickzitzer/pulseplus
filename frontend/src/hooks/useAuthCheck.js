import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth';

const publicRoutes = ['/login', '/terms-of-service']; // Add any other public routes here

export const useAuthCheck = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user && !publicRoutes.includes(router.pathname)) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { isAuthorized: !!user || publicRoutes.includes(router.pathname), loading };
};