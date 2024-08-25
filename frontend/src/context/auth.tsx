import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import { DataModelFields } from '../types/dataModels';
import { setCookie, getCookie, deleteCookie } from 'cookies-next';

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
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}` + '/api';
      if (!apiUrl) {
        throw new Error('API URL is not defined');
      }
      const response = await axios.post(`${apiUrl}/auth/login`, { user_name, password });
      const { token, user: userData, competitor: competitorData } = response.data;
      
      // Set HttpOnly cookie for auth token (this should be done server-side)
      setCookie('auth_token', token, { 
        maxAge: 30 * 60, // 30 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      
      // Store non-sensitive data in localStorage
      localStorage.setItem('user_data', JSON.stringify(userData));
      localStorage.setItem('competitor_data', JSON.stringify(competitorData));
      
      // Set state for in-memory data
      setUser(userData);
      setCompetitor(competitorData);
      
      router.push('/');
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = useCallback(async () => {
    deleteCookie('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('competitor_data');
    setUser(null);
    setCompetitor(null);
    router.push('/login');
  }, [router]);

  const updateUser = (updatedData: Partial<User>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedData };
      localStorage.setItem('user_data', JSON.stringify(newUser));
      return newUser;
    });
  };

  const updateCompetitor = (updatedData: Partial<Competitor>) => {
    setCompetitor(prevCompetitor => {
      if (!prevCompetitor) return null;
      const newCompetitor = { ...prevCompetitor, ...updatedData };
      localStorage.setItem('competitor_data', JSON.stringify(newCompetitor));
      return newCompetitor;
    });
  };

  const refreshToken = useCallback(async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL}:${process.env.NEXT_PUBLIC_BACKEND_PORT}` + '/api';
      if (!apiUrl) {
        throw new Error('API URL is not defined');
      }
      const response = await axios.post(`${apiUrl}/auth/refresh-token`, {}, {
        headers: { Authorization: `Bearer ${getCookie('auth_token')}` }
      });
      const { token } = response.data;
      setCookie('auth_token', token, { 
        maxAge: 30 * 60, // 30 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });
      return token;
    } catch (error) {
      console.error('Token refresh failed', error);
      throw error;
    }
  }, []);

  const checkTokenExpiration = useCallback(async () => {
    const token = getCookie('auth_token');
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
    const token = getCookie('auth_token');
    const userData = localStorage.getItem('user_data');
    const competitorData = localStorage.getItem('competitor_data');
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