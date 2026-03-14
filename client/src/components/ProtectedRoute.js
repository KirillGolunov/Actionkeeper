import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, authError, loading } = useAuth();
  const hasStoredToken = typeof window !== 'undefined' && !!localStorage.getItem('jwt');

  if (loading || (!isAuthenticated && hasStoredToken && !authError)) {
    return null;
  }

  if (!isAuthenticated || authError) {
    return <Navigate to="/signin" replace state={authError ? { message: authError } : undefined} />;
  }

  return children;
}
