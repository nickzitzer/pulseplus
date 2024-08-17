import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/auth';
import Layout from '@/components/Layout';
import '@/styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, refreshToken } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user && router.pathname !== '/login' && router.pathname !== '/terms-of-service') {
        router.push('/login');
      } else {
        setIsReady(true);
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleRouteChange = async () => {
      if (user) {
        try {
          await refreshToken();
        } catch (error) {
          console.error('Token refresh failed', error);
          router.push('/login');
        }
      }
    };

    router.events.on('routeChangeStart', handleRouteChange);

    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [user, refreshToken, router]);

  if (loading || !isReady) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Layout>
        <AuthWrapper>
          <Component {...pageProps} />
        </AuthWrapper>
      </Layout>
    </AuthProvider>
  );
}

export default MyApp;