import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuthStatus = useCallback(async () => {
    // Check if we have a cached user in localStorage
    const cachedUser = localStorage.getItem('cachedUser');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/current-user', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Cache the user in localStorage
        localStorage.setItem('cachedUser', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = useCallback((userData) => {
    setUser(userData);
    // Cache the user in localStorage
    localStorage.setItem('cachedUser', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    } finally {
      setUser(null);
      localStorage.removeItem('cachedUser');
      router.push('/login');
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, checkAuthStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);