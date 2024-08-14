import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/auth';

const PublicPage = ({ children }) => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && router.pathname === '/login') {
      router.push('/');
    }
  }, [user, router]);

  return children;
};

export default PublicPage;