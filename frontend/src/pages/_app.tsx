import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../context/auth';
import Layout from '@/components/Layout';
import '@/styles/globals.css';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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