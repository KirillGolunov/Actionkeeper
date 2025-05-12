import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function MagicLinkCallback() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let didRedirect = false;
    const verifyToken = async () => {
      try {
        const res = await axios.get(`/api/auth/magic-link/${token}`);
        login(res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        didRedirect = true;
        navigate('/', { replace: true });
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired link.');
        setLoading(false);
      }
    };
    verifyToken();
    return () => { if (didRedirect) setError(null); };
  }, [token, navigate, login]);

  return (
    <Box sx={{ minHeight: '100vh', background: '#F7F8FA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {loading ? (
        <>
          <CircularProgress sx={{ mb: 3 }} />
          <Typography sx={{ fontWeight: 600, color: '#5673DC', fontSize: 18 }}>Logging you in…</Typography>
        </>
      ) : error ? (
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          <Button variant="contained" component={RouterLink} to="/signin" sx={{ background: '#5673DC', '&:hover': { background: '#4A69D9' } }}>
            Go to Sign In
          </Button>
        </Box>
      ) : null}
    </Box>
  );
} 