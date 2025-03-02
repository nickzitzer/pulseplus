import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import api, { setAuthTokens, clearAuthTokens, hasAuthTokens } from './api';
import { UserRole, Permission, userHasPermission } from './permissions';

export interface User {
  sys_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role: UserRole;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  sys_created_at: string;
  sys_updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  confirmResetPassword: (token: string, password: string) => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        if (hasAuthTokens()) {
          const response = await api.get('/users/me');
          setUser(response.data);
        } else {
          setUser(null);
        }
      } catch (err) {
        // User is not authenticated, but this isn't an error
        setUser(null);
        clearAuthTokens();
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<AuthResponse>('/auth/login', credentials);
      const { access_token, refresh_token, user } = response.data;
      
      // Store tokens
      setAuthTokens(access_token, refresh_token);
      
      // Set user
      setUser(user);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await api.post('/auth/logout');
      clearAuthTokens();
      setUser(null);
    } catch (err) {
      setError(err as Error);
      // Still clear tokens and user even if the API call fails
      clearAuthTokens();
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<AuthResponse>('/auth/register', data);
      const { access_token, refresh_token, user } = response.data;
      
      // Store tokens
      setAuthTokens(access_token, refresh_token);
      
      // Set user
      setUser(user);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/auth/password/reset-request', { email });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmResetPassword = async (token: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/auth/password/reset', { token, password });
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put<User>('/users/me', data);
      setUser(response.data);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    return userHasPermission({ role: user.role as UserRole }, permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        resetPassword,
        confirmResetPassword,
        hasPermission,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth; 