import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/context/auth';
import { SSOLoginButtons } from '@/components/admin';

/**
 * Login Page
 * 
 * Purpose: User authentication
 * Route: /login
 * Key Components: Email/password form, SSO options, "Remember me", Password recovery, Registration link
 */
const LoginPage = () => {
  const [user_name, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { login, intendedUrl } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(user_name, password);
      router.push(intendedUrl || '/');
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid user name or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login | PulsePlus</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input type="hidden" name="remember" value="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="user_name" className="sr-only">User Name</label>
                <input
                  id="user_name"
                  name="user_name"
                  type="text"
                  required
                  autoComplete="username"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="User Name"
                  value={user_name}
                  onChange={(e) => setUserName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            <div className="mt-6">
              <SSOLoginButtons />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
