import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../context/auth';
import { useAuthCheck } from '../hooks/useAuthCheck';
import Layout from '@/components/Layout'; // Updated import statement
import '@/styles/globals.css';

const publicRoutes = ['/login', '/terms-of-service'];

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <AuthWrapper>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AuthWrapper>
    </AuthProvider>
  );
}

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>; // Or a loading spinner
  }

  if (!user && !publicRoutes.includes(router.pathname)) {
    router.push('/login');
    return null;
  }

  return <>{children}</>;
}

export default MyApp;
