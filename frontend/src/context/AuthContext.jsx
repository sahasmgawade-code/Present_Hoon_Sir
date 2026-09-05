import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client.js';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => {
    const stored = localStorage.getItem('phsams_admin');
    return stored ? JSON.parse(stored) : null;
  });
  const login = useCallback(async (email, password, csrfToken) => {
    const data = await api.login(email, password, csrfToken);
    localStorage.setItem('phsams_admin', JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  }, []);
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('phsams_admin');
      setAdmin(null);
    }
  }, []);
  const updateOwnName = useCallback((newName) => {
    setAdmin((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, name: newName };
      localStorage.setItem('phsams_admin', JSON.stringify(updated));
      return updated;
    });
  }, []);
  return (
    <AuthContext.Provider
      value={{ admin, login, logout, updateOwnName, isSuperAdmin: admin?.role === 'super_admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}