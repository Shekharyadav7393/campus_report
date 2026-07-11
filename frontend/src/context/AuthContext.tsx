import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/axios.js';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'super-admin' | 'campus-admin' | 'staff' | 'student' | 'faculty' | 'visitor';
  campusId?: string;
  isVerified: boolean;
  twoFactorEnabled?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const response = await api.get('/auth/me');
      setUser(response.data.data.user);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    const handleSessionExpired = () => {
      setUser(null);
      alert('Your session has expired. Please log in again.');
    };

    window.addEventListener('auth_session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('auth_session_expired', handleSessionExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = res.data.data;
      localStorage.setItem('token', accessToken);
      setUser(userData);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (signupData: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', signupData);
      const { accessToken, user: userData } = res.data.data;
      localStorage.setItem('token', accessToken);
      setUser(userData);
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, checkSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
