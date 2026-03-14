import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, CircularProgress, Link } from '@mui/material';
import axios from 'axios';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function SignIn() {
  const { t } = useTranslation();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [devMagicLink, setDevMagicLink] = useState(null);
  const [error, setError] = useState(null);
  const sessionError = location.state && location.state.message;
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setDevMagicLink(null);
    try {
      const res = await axios.post('/api/auth/magic-link', { email });
      setSuccess(true);
      setCooldown(60);
      if (res.data?.magicLink) {
        setDevMagicLink(res.data.magicLink);
      }
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(60);
      }
      setError(getApiErrorMessage(err, t, 'auth.signIn.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, minWidth: 370, maxWidth: 400, background: 'transparent', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {sessionError && <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>{sessionError}</Alert>}
        <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#222', mb: 2, textAlign: 'center' }}>
          {t('auth.signIn.title')}
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#444', mb: 3, textAlign: 'center' }}>
          {t('auth.signIn.subtitle')}
        </Typography>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', width: '100%', mb: 1.5 }}>
            <TextField
              type="email"
              placeholder={t('auth.signIn.emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              size="small"
              sx={{ flex: 1, background: '#fff', borderRadius: 2, mr: 1 }}
              InputLabelProps={{ style: { fontSize: 14 } }}
              inputProps={{ style: { fontSize: 15 } }}
              disabled={loading || cooldown > 0}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{ background: '#5673DC', color: '#fff', fontWeight: 600, borderRadius: 2, minWidth: 100, height: 40, fontSize: 15, '&:hover': { background: '#4A69D9' } }}
              disabled={loading || !email || cooldown > 0}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : cooldown > 0 ? t('auth.signIn.resendIn', { seconds: cooldown }) : t('auth.signIn.send')}
            </Button>
          </Box>
        </form>
        {success && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>{t('auth.signIn.success')}</Alert>}
        {devMagicLink && (
          <Alert severity="info" sx={{ mt: 2, width: '100%' }}>
            {t('auth.signIn.localTesting')}{' '}
            <Link href={devMagicLink} target="_blank" rel="noopener">
              {t('auth.signIn.openMagicLink')}
            </Link>
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        <Typography sx={{ fontSize: 13, color: '#888', mt: 3, textAlign: 'center' }}>
          {t('auth.signIn.emailHint')}<br />
          {t('auth.signIn.noEmail')}{' '}
          <Link href="mailto:admin@yourdomain.com" underline="hover" sx={{ color: '#5673DC', fontWeight: 500 }}>
            {t('auth.signIn.contactAdmin')}
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
