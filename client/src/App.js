import React, { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box } from '@mui/material';
import Navbar from './components/Navbar';
import Projects from './pages/Projects';
import TimeEntries from './pages/TimeEntries';
import Clients from './pages/Clients';
import Users from './pages/Users';
import DashboardsNew from './pages/Dashboards_new';
import SMTPSettings from './pages/SMTPSettings';
import AcceptInvitation from './pages/AcceptInvitation';
import SignIn from './pages/SignIn';
import MagicLinkCallback from './pages/MagicLinkCallback';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Profile from './pages/Profile';
import Setup from './pages/Setup';
import axios from 'axios';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'admin') {
    return <div style={{ padding: 32, textAlign: 'center', fontSize: 20, color: '#b71c1c' }}>Not authorized</div>;
  }
  return children;
}

function SetupCheck() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/signin' ||
    location.pathname.startsWith('/auth/magic-link/') ||
    location.pathname.startsWith('/invite/accept/') ||
    location.pathname === '/setup';
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (isAuthPage || loading || !isAuthenticated) return;
    axios.get('/api/users').catch(err => {
      if (
        err.response &&
        err.response.status === 403 &&
        err.response.data &&
        typeof err.response.data.error === 'string' &&
        err.response.data.error.includes('Initial setup required')
      ) {
        window.location.href = '/setup';
      }
    });
  }, [location.pathname, isAuthPage, isAuthenticated, loading]);
  return null;
}

function App() {
  const location = useLocation();
  console.log('App.js location.pathname:', location.pathname);
  const isAuthPage =
    location.pathname === '/signin' ||
    location.pathname.startsWith('/auth/magic-link/') ||
    location.pathname.startsWith('/invite/accept/') ||
    location.pathname === '/setup';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SetupCheck />
        {isAuthPage ? (
          <Routes>
            <Route path="/signin" element={<SignIn />} />
            <Route path="/auth/magic-link/:token" element={<MagicLinkCallback />} />
            <Route path="/invite/accept/:token" element={<AcceptInvitation />} />
            <Route path="/setup" element={<Setup />} />
          </Routes>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navbar />
            <Box component="main" sx={{ mt: 4, mb: 4, flex: 1, width: '100%', px: 4 }}>
              <Routes>
                <Route path="/" element={<ProtectedRoute><DashboardsNew /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                <Route path="/time-entries" element={<ProtectedRoute><TimeEntries /></ProtectedRoute>} />
                <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
                <Route path="/settings/smtp" element={<ProtectedRoute><AdminRoute><SMTPSettings /></AdminRoute></ProtectedRoute>} />
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } />
                <Route path="/setup" element={<Setup />} />
              </Routes>
            </Box>
          </Box>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 