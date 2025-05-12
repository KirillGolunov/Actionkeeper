import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';

export default function AcceptInvitation() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', surname: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await axios.get(`/api/invitations/accept/${token}`);
        setForm({ name: res.data.name || '', surname: res.data.surname || '', email: res.data.email });
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired invitation.');
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await axios.post(`/api/invitations/accept/${token}`, {
        name: form.name,
        surname: form.surname,
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500); // Redirect after success
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete registration.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, minWidth: 470, maxWidth: 520 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#5673DC', mb: 1.5, fontSize: 22 }}>Accept Invitation</Typography>
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 17, color: '#222', fontWeight: 700, mb: 0.8 }}>Welcome to TimeTracker!</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>
            This service helps you log and manage your time across projects with ease.
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>
            No passwords required — you'll access your account through a magic link sent to your registered email.
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>
            No need to remember new passwords — just click and go!
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mt: 1.2 }}>
            Please verify that your name is correct and complete your registration to get started.
          </Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {success ? (
          <Alert severity="success">Registration complete! Redirecting...</Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField
              label="Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              fullWidth
              required
              size="small"
              sx={{ mb: 1.2 }}
              InputLabelProps={{ style: { fontSize: 14 } }}
              inputProps={{ style: { fontSize: 15 } }}
            />
            <TextField
              label="Surname"
              name="surname"
              value={form.surname}
              onChange={handleChange}
              fullWidth
              required
              size="small"
              sx={{ mb: 1.2 }}
              InputLabelProps={{ style: { fontSize: 14 } }}
              inputProps={{ style: { fontSize: 15 } }}
            />
            <TextField
              label="Email"
              value={form.email}
              fullWidth
              InputProps={{ readOnly: true, style: { fontSize: 15 } }}
              InputLabelProps={{ style: { fontSize: 14 } }}
              size="small"
              sx={{ mb: 1.2 }}
            />
            <Typography sx={{ fontSize: 12, color: '#888', mb: 1.2 }}>
              You'll log in passwordlessly via a magic link sent to your email.
            </Typography>
            <Button type="submit" variant="contained" fullWidth sx={{ background: '#5673DC', fontWeight: 600, fontSize: 15, borderRadius: 2, height: 38, minHeight: 36, '&:hover': { background: '#4A69D9' }, mt: 0.5 }} disabled={submitting}>
              {submitting ? 'Registering...' : 'Complete Registration'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
} 