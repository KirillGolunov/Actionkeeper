import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Grid,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Setup() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState({ name: '', surname: '', email: '' });
  const [smtp, setSmtp] = useState({ host: '', port: '', user: '', pass: '', from: '', secure: false });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const isProduction = process.env.NODE_ENV === 'production';

  const handleAdminChange = (e) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
  };
  const handleSmtpChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSmtp({
      ...smtp,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await axios.post('/api/setup', { ...admin, smtp });
      setSuccess('Setup complete! Redirecting to sign in...');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestEmailStatus(null);
    setTestEmailLoading(true);
    try {
      await axios.post('/api/smtp-test', { ...smtp, to: admin.email });
      setTestEmailStatus({ type: 'success', msg: 'Test email sent successfully!' });
    } catch (err) {
      setTestEmailStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to send test email.' });
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 2, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={1} sx={{ border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: 1, maxWidth: 650, mx: 'auto', p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#5673DC' }}>Initial Setup</Typography>
        </Box>
        <Typography variant="body1" sx={{ mb: 2, color: '#222', fontSize: 14, lineHeight: 1.6 }}>
        <b>Welcome to TimeTracker!</b><br />
        TimeTracker helps your team log hours and stay on top of project work — simply and securely.<br />
        To get started, enter your admin details and set up email so we can send magic login links (no passwords needed!).<br />
        You can test your email settings before finishing.<br />
        When you're all set, hit <b>Complete Setup</b> and you're good to go!
        </Typography>
        {!isProduction && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Local development tip: you can leave SMTP blank and finish setup.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: '#5673DC' }}>Admin User</Typography>
              <TextField label="Name" name="name" value={admin.name} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
              <TextField label="Surname" name="surname" value={admin.surname} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
              <TextField label="Email" name="email" value={admin.email} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: '#5673DC' }}>SMTP Settings</Typography>
              <TextField label="Host" name="host" value={smtp.host} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label="Port" name="port" value={smtp.port} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label="User" name="user" value={smtp.user} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label="Password" name="pass" value={smtp.pass} onChange={handleSmtpChange} type="password" fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label="From Email" name="from" value={smtp.from} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <FormControlLabel
                control={<Checkbox name="secure" checked={smtp.secure} onChange={handleSmtpChange} size="small" />}
                label={<span style={{ fontSize: 14 }}>Use SSL/TLS (secure connection)</span>}
                sx={{ mb: 1 }}
              />
              <Button
                variant="outlined"
                sx={{ mt: 0.5, mb: 0.5, borderRadius: 2, color: '#5673DC', borderColor: '#8196E4', background: '#F5F7FE', '&:hover': { background: '#E2E4E9' }, fontSize: 14, py: 0.5 }}
                onClick={handleTestEmail}
                disabled={testEmailLoading || !isProduction}
                fullWidth
                size="small"
              >
                {testEmailLoading ? 'Sending...' : 'Send Test Email'}
              </Button>
              {testEmailStatus && (
                <Alert severity={testEmailStatus.type} sx={{ mt: 0.5, fontSize: 14 }}>{testEmailStatus.msg}</Alert>
              )}
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                type="submit"
                sx={{ mt: 1, background: '#8196E4', color: '#fff', fontWeight: 600, borderRadius: 2, fontSize: 15, boxShadow: 2, textTransform: 'none', px: 2, py: 0.7, '&:hover': { background: '#4A69D9' } }}
                disabled={loading}
                fullWidth
                size="medium"
              >
                {loading ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
} 

