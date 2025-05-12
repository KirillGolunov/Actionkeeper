import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, CircularProgress, Link } from '@mui/material';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

export default function SignIn() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const sessionError = location.state && location.state.message;
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Cooldown timer effect
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
    try {
      await axios.post('/api/auth/magic-link', { email });
      setSuccess(true);
      setCooldown(60);
    } catch (err) {
      // If rate limited, start cooldown anyway
      if (err.response?.status === 429) {
        setCooldown(60);
      }
      setError(err.response?.data?.error || 'Failed to send magic link.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      await axios.post('/api/auth/magic-link', { email });
      setResendSuccess(true);
      setCooldown(60);
    } catch (err) {
      // If rate limited, start cooldown anyway
      if (err.response?.status === 429) {
        setCooldown(60);
      }
      setResendError(err.response?.data?.error || 'Failed to resend magic link.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {/* Logo or illustration */}
      {/* <img src="/logo192.png" alt="TimeTracker" style={{ width: 56, marginBottom: 24 }} /> */}
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, minWidth: 370, maxWidth: 400, background: 'transparent', boxShadow: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Optionally add an illustration here */}
        {sessionError && <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>{sessionError}</Alert>}
        <Typography sx={{ fontWeight: 700, fontSize: 20, color: '#222', mb: 2, textAlign: 'center' }}>
          Welcome to TimeTracker
        </Typography>
        <Typography sx={{ fontSize: 15, color: '#444', mb: 3, textAlign: 'center' }}>
          Enter your email to receive a magic link for passwordless login.
        </Typography>
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', width: '100%', mb: 1.5 }}>
            <TextField
              type="email"
              placeholder="Enter your email"
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
              {loading ? <CircularProgress size={22} color="inherit" /> : cooldown > 0 ? `Resend in ${cooldown}s` : 'Send'}
            </Button>
          </Box>
        </form>
        {success && <Alert severity="success" sx={{ mt: 2, width: '100%' }}>Check your email for a login link!</Alert>}
        {error && <Alert severity="error" sx={{ mt: 2, width: '100%' }}>{error}</Alert>}
        <Typography sx={{ fontSize: 13, color: '#888', mt: 3, textAlign: 'center' }}>
          A login link will be sent to your email address.<br />
          Didn't get the email?{' '}
          <Link href="mailto:admin@yourdomain.com" underline="hover" sx={{ color: '#5673DC', fontWeight: 500 }}>
            Contact the platform administrator
          </Link>
        </Typography>
      </Paper>
      {/* Optional: App name or logo at the bottom */}
      {/* <Box sx={{ mt: 6, color: '#5673DC', fontWeight: 700, fontSize: 18 }}>TimeTracker</Box> */}
    </Box>
  );
} 