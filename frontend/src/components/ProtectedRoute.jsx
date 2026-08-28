import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
export default function ProtectedRoute({ children, superAdminOnly = false }) {
  const { admin } = useAuth();
  if (!admin) return <Navigate to="/login" replace />;
  if (superAdminOnly && admin.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
}