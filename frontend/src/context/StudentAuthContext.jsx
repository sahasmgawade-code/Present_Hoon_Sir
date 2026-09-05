import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client.js';
const StudentAuthContext = createContext(null);
export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(() => {
    const stored = localStorage.getItem('phsams_student');
    return stored ? JSON.parse(stored) : null;
  });
  const login = useCallback(async (loginId, password, csrfToken) => {
    const data = await api.studentLogin(loginId, password, csrfToken);
    localStorage.setItem('phsams_student', JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  }, []);
  const logout = useCallback(async () => {
    try {
      await api.studentLogout();
    } finally {
      localStorage.removeItem('phsams_student');
      setStudent(null);
    }
  }, []);
  return (
    <StudentAuthContext.Provider value={{ student, login, logout }}>
      {children}
    </StudentAuthContext.Provider>
  );
}
export function useStudentAuth() {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error('useStudentAuth must be used within StudentAuthProvider');
  return ctx;
}