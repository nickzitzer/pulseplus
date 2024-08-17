import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { DataModelFields } from '../types/dataModels';

type User = typeof DataModelFields.User;
type Competitor = typeof DataModelFields.Competitor;

interface AuthContextType {
  user: User | null;
  competitor: Competitor | null;
  login: (user_name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  updateCompetitor: (updatedData: Partial<Competitor>) => void;
  refreshToken: () => Promise<string>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const login = async (user_name: string, password: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL is not defined');
      }
      const response = await axios.post(`${apiUrl}/auth/login`, { user_name, password });
      const { token, user: userData, competitor: competitorData } = response.data;
      Cookies.set('auth_token', token, { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      
      // Store full user and competitor data in state and cookies
      setUser(userData);
      setCompetitor(competitorData);
      Cookies.set('user_data', JSON.stringify(userData), { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      Cookies.set('competitor_data', JSON.stringify(competitorData), { expires:new Date(new Date().getTime() + 30 * 60 * 1000) });
      
      router.push('/');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    Cookies.remove('auth_token');
    Cookies.remove('user_data');
    Cookies.remove('competitor_data');
    setUser(null);
    setCompetitor(null);
    router.push('/login');
  }, [router]);

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      Cookies.set('user_data', JSON.stringify(newUser), { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      return newUser;
    });
  };

  const updateCompetitor = (updatedData: Partial<Competitor>) => {
    setCompetitor(prevCompetitor => {
      if (!prevCompetitor) return null;
      const newCompetitor = { ...prevCompetitor, ...updatedData };
      Cookies.set('competitor_data', JSON.stringify(newCompetitor), { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      return newCompetitor;
    });
  };

  const refreshToken = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('API URL is not defined');
      }
      const response = await axios.post(`${apiUrl}/auth/refresh-token`, {}, {
        headers: { Authorization: `Bearer ${Cookies.get('auth_token')}` }
      });
      const { token } = response.data;
      Cookies.set('auth_token', token, { expires: new Date(new Date().getTime() + 30 * 60 * 1000) });
      return token;
    } catch (error) {
      console.error('Token refresh failed', error);
      throw error;
    }
  }, []);

  const checkTokenExpiration = useCallback(async () => {
    const token = Cookies.get('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode<{ exp?: number }>(token);
        if (decoded.exp && decoded.exp - Date.now() / 1000 < 300) { // Refresh if less than 5 minutes left
          await refreshToken();
        } else if (decoded.exp && decoded.exp < Date.now() / 1000) {
          await logout();
        }
      } catch (error) {
        console.error('Token check failed', error);
        await logout();
      }
    }
  }, [logout, refreshToken]);

  const checkAuthStatus = useCallback(async () => {
    const token = Cookies.get('auth_token');
    const userData = Cookies.get('user_data');
    const competitorData = Cookies.get('competitor_data');
    if (token && userData && competitorData) {
      try {
        await checkTokenExpiration();
        setUser(JSON.parse(userData));
        setCompetitor(JSON.parse(competitorData));
      } catch (error) {
        console.error('Invalid token or data', error);
        await logout();
      }
    } else {
      setUser(null);
      setCompetitor(null);
    }
    setLoading(false);
  }, [logout, checkTokenExpiration]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      checkTokenExpiration();
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [checkTokenExpiration]);

  return (
    <AuthContext.Provider value={{ user, competitor, login, logout, updateUser, updateCompetitor, refreshToken, loading }}>
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