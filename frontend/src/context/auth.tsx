import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '../utils/api';
import { DataModelFields } from '../types/dataModels';
import axios from 'axios';

type User = typeof DataModelFields.User;
type Competitor = typeof DataModelFields.Competitor;

interface AuthContextType {
  user: User | null;
  competitor: Competitor | null;
  login: (user_name: string, password: string) => Promise<void>;
  loginWithSSO: (providerId: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  updateCompetitor: (updatedData: Partial<Competitor>) => void;
  refreshToken: () => Promise<void>;
  loading: boolean;
  intendedUrl: string | null;
  setIntendedUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [loading, setLoading] = useState(true);
  const [intendedUrl, setIntendedUrl] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const login = useCallback(async (user_name: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { user_name, password });
      const { user: userData, competitor: competitorData } = response.data;
      setUser(userData);
      setCompetitor(competitorData);
      if (intendedUrl) {
        router.push(intendedUrl);
        setIntendedUrl(null); // Clear the intended URL after use
      } else {
        router.push('/');
      }
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  }, [intendedUrl, router, setIntendedUrl]);

  const loginWithSSO = useCallback(async (providerId: string) => {
    window.location.href = `${api.defaults.baseURL}/auth/sso/${providerId}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    }
    setUser(null);
    setCompetitor(null);
    router.push('/login');
  }, [router]);

  const updateUser = useCallback((updatedData: Partial<User>) => {
    setUser(prevUser => prevUser ? { ...prevUser, ...updatedData } : null);
  }, []); // Added useCallback to memoize the function

  const updateCompetitor = useCallback((updatedData: Partial<Competitor>) => {
    setCompetitor(prevCompetitor => prevCompetitor ? { ...prevCompetitor, ...updatedData } : null);
  }, []); // Wrapped in useCallback to memoize the function

  const refreshToken = useCallback(async () => {
    if (!user) {
      console.error('Cannot refresh token: User is not authenticated');
      return;
    }
    try {
      await api.post('/auth/refresh-token');
    } catch (error) {
      console.error('Token refresh failed', error);
      throw error;
    }
  }, [user]);

  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${api.defaults.baseURL}/auth/me`, { withCredentials: true });
      setUser(response.data.user);
      setCompetitor(response.data.competitor);
    } catch (error) {
      console.error('Auth check failed', error);
      setUser(null);
      setCompetitor(null);
      if (pathname !== '/login' && pathname !== '/terms-of-service') {
        setIntendedUrl(pathname); // Store the intended URL
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const contextValue = useMemo(() => ({
    user,
    competitor,
    login,
    loginWithSSO,
    logout,
    updateUser, // Now stable reference
    updateCompetitor, // Now stable reference
    refreshToken,
    loading,
    intendedUrl,
    setIntendedUrl
  }), [user, competitor, login, loginWithSSO, logout, updateUser, updateCompetitor, refreshToken, loading, intendedUrl, setIntendedUrl]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};