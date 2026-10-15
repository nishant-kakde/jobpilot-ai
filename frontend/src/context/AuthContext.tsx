import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const u = await api.getMe();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('jobpilot_token');
      if (token) {
        try {
          const u = await api.getMe();
          setUser(u);
        } catch {
          localStorage.removeItem('jobpilot_token');
          setUser(null);
        }
      } else {
        // Auto-login with seeded demo user for frictionless instant preview!
        try {
          const res = await api.login('demo@jobpilot.ai', 'password123');
          setUser(res.user);
        } catch {
          // If backend isn't ready or already customized, leave user null
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name: string) => {
    const res = await api.register(email, pass, name);
    setUser(res.user);
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
