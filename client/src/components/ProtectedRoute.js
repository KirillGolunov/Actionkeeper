import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authError, loading } = useAuth();
  console.log('ProtectedRoute', { isAuthenticated, authError, loading });
  if (loading) {
    // Optionally render a spinner here
    return null;
  }
  if (!isAuthenticated || authError) {
    return <Navigate to="/signin" replace state={authError ? { message: authError } : undefined} />;
  }
  return children;
} 