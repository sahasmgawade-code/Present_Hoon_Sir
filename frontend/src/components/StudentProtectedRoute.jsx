import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStudentAuth } from '../context/StudentAuthContext.jsx';
export default function StudentProtectedRoute({ children }) {
  const { student } = useStudentAuth();
  if (!student) return <Navigate to="/login?role=student" replace />;
  return children;
}