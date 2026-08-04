import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function ProtectedAppLayout({ children }) {
  const { isAuthenticated, authError, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F7F8FA',
        }}
      >
        <CircularProgress aria-label="Проверка сессии" />
      </Box>
    );
  }

  if (!isAuthenticated || authError) {
    return <Navigate to="/signin" replace state={authError ? { message: authError } : undefined} />;
  }

  return children;
}
