import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const FacultyAuthContext = createContext(null);

export function FacultyAuthProvider({ children }) {
  const [faculty, setFaculty] = useState(() => {
    const stored = localStorage.getItem('attendqr_faculty');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email, password) => {
    const data = await api.facultyLogin(email, password);
    localStorage.setItem('attendqr_faculty_token', data.token);
    localStorage.setItem('attendqr_faculty', JSON.stringify(data.faculty));
    setFaculty(data.faculty);
    return data.faculty;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('attendqr_faculty_token');
    localStorage.removeItem('attendqr_faculty');
    setFaculty(null);
  }, []);

  return (
    <FacultyAuthContext.Provider value={{ faculty, login, logout }}>
      {children}
    </FacultyAuthContext.Provider>
  );
}

export function useFacultyAuth() {
  const ctx = useContext(FacultyAuthContext);
  if (!ctx) throw new Error('useFacultyAuth must be used within FacultyAuthProvider');
  return ctx;
}