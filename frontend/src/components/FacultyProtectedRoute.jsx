import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFacultyAuth } from '../context/FacultyAuthContext.jsx';
export default function FacultyProtectedRoute({ children }) {
  const { faculty } = useFacultyAuth();
  if (!faculty) return <Navigate to="/faculty/login" replace />;
  return children;
}