import React, { createContext, useContext, useState, useEffect } from 'react';
import apiFetch from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('spendflow_token');
      if (token) {
        try {
          const res = await apiFetch('/auth/me');
          if (res.success && res.user) {
            setUser(res.user);
          }
        } catch (e) {
          console.warn('Auth token expired or invalid');
          localStorage.removeItem('spendflow_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.token) {
      localStorage.setItem('spendflow_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (res.success && res.token) {
      localStorage.setItem('spendflow_token', res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('spendflow_token');
    setUser(null);
    window.location.href = '/login';
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
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
