import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const StudentAuthContext = createContext(null);

export function StudentAuthProvider({ children }) {
  const [student, setStudent] = useState(() => {
    const stored = localStorage.getItem('attendqr_student');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (loginId, password) => {
    const data = await api.studentLogin(loginId, password);
    localStorage.setItem('attendqr_student_token', data.token);
    localStorage.setItem('attendqr_student', JSON.stringify(data.student));
    setStudent(data.student);
    return data.student;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('attendqr_student_token');
    localStorage.removeItem('attendqr_student');
    setStudent(null);
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