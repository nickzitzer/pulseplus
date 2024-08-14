import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import { AuthProvider } from '../context/auth';
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
  const isAuthorized = useAuthCheck();

  // You can add a loading state here if needed
  if (!isAuthorized) {
    return null; // or return a loading spinner
  }

  return <>{children}</>;
}

export default MyApp;
