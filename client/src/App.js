import React, { useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import AutoLoginInfoDialog from './components/AutoLoginInfoDialog';
import Projects from './pages/Projects';
import Clients from './pages/Clients';
import Users from './pages/Users';
import Home from './pages/Home';
import SMTPSettings from './pages/SMTPSettings';
import AcceptInvitation from './pages/AcceptInvitation';
import SignIn from './pages/SignIn';
import MagicLinkCallback from './pages/MagicLinkCallback';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAppLayout from './components/ProtectedAppLayout';
import Profile from './pages/Profile';
import Setup from './pages/Setup';
import axios from 'axios';
import { useTranslation } from './i18n/I18nProvider';
import AppShell from './components/AppShell';
import { appTheme } from './appTheme';

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  if (loading) return null;
  if (!user || user.role !== 'admin') {
    return <div style={{ padding: 32, textAlign: 'center', fontSize: 20, color: '#b71c1c' }}>{t('common.notAuthorized')}</div>;
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
    axios.get('/api/setup-required').then((response) => {
      if (response.data?.setupRequired) window.location.href = '/setup';
    }).catch(err => {
      if (
        err.response &&
        err.response.status === 403 &&
        err.response.data &&
        err.response.data.errorCode === 'setup.required'
      ) {
        window.location.href = '/setup';
      }
    });
  }, [location.pathname, isAuthPage, isAuthenticated, loading]);

  return null;
}

function App() {
  const location = useLocation();
  const isAuthPage =
    location.pathname === '/signin' ||
    location.pathname.startsWith('/auth/magic-link/') ||
    location.pathname.startsWith('/invite/accept/') ||
    location.pathname === '/setup';

  return (
    <ThemeProvider theme={appTheme}>
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
          <ProtectedAppLayout>
            <AppShell>
              <AutoLoginInfoDialog />
              <Box component="main" sx={{ height: '100%', minHeight: 0, width: '100%', overflow: 'hidden' }}>
                <Routes>
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
                  <Route path="/time-entries" element={<Navigate to="/?mode=mine" replace />} />
                  <Route path="/clients" element={<ProtectedRoute><AdminRoute><Clients /></AdminRoute></ProtectedRoute>} />
                  <Route path="/users" element={<ProtectedRoute><AdminRoute><Users /></AdminRoute></ProtectedRoute>} />
                  <Route path="/settings/smtp" element={<ProtectedRoute><AdminRoute><SMTPSettings /></AdminRoute></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/setup" element={<Setup />} />
                </Routes>
              </Box>
            </AppShell>
          </ProtectedAppLayout>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
