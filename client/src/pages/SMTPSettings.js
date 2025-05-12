import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';

function SMTPSettings() {
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    auth: { user: '', pass: '' },
    from: '',
    secure: false,
  });
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  useEffect(() => {
    axios.get('/api/smtp-settings').then(res => {
      setSettings({ ...settings, ...res.data });
    });
    // eslint-disable-next-line
  }, []);

  const handleChange = (field, value) => {
    if (field.startsWith('auth.')) {
      setSettings(s => ({ ...s, auth: { ...s.auth, [field.split('.')[1]]: value } }));
    } else {
      setSettings(s => ({ ...s, [field]: value }));
    }
  };

  const handleSave = async () => {
    setSaveResult(null);
    setLoading(true);
    try {
      await axios.post('/api/smtp-settings', {
        host: settings.host,
        port: settings.port,
        user: settings.auth.user,
        pass: settings.auth.pass,
        from: settings.from,
        secure: settings.secure
      });
      setSaveResult({ success: true, message: 'Settings saved.' });
    } catch (err) {
      setSaveResult({ success: false, message: err.response?.data?.error || 'Failed to save settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestResult(null);
    setLoading(true);
    try {
      await axios.post('/api/smtp-test', {
        host: settings.host,
        port: settings.port,
        user: settings.auth.user,
        pass: settings.auth.pass,
        from: settings.from,
        secure: settings.secure,
        to: testEmail
      });
      setTestResult({ success: true, message: 'Test email sent successfully.' });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.error || 'Failed to send test email.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 3, border: '1px solid #E2E4E9', borderRadius: 3, background: '#fff' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>SMTP Settings</Typography>
      <TextField
        label="SMTP Host"
        fullWidth
        margin="normal"
        value={settings.host}
        onChange={e => handleChange('host', e.target.value)}
        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
      />
      <TextField
        label="SMTP Port"
        type="number"
        fullWidth
        margin="normal"
        value={settings.port}
        onChange={e => handleChange('port', parseInt(e.target.value, 10))}
        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
      />
      <TextField
        label="Username"
        fullWidth
        margin="normal"
        value={settings.auth.user}
        onChange={e => handleChange('auth.user', e.target.value)}
        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
      />
      <TextField
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        value={settings.auth.pass}
        onChange={e => handleChange('auth.pass', e.target.value)}
        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
      />
      <TextField
        label="From Address"
        fullWidth
        margin="normal"
        value={settings.from}
        onChange={e => handleChange('from', e.target.value)}
        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
      />
      <FormControlLabel
        control={<Switch checked={!!settings.secure} onChange={e => handleChange('secure', e.target.checked)} />}
        label="Use SSL/TLS (secure)"
        sx={{ mt: 1, mb: 2 }}
      />
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={loading}
          sx={{
            minWidth: 70,
            height: 32,
            borderRadius: 2,
            fontWeight: 500,
            fontSize: 12,
            textTransform: 'none',
            px: 1.2,
            backgroundColor: '#8196E4',
            color: '#FFFFFF',
            boxShadow: 3,
            '&:hover': {
              backgroundColor: '#4A69D9',
            },
          }}
        >
          Save
        </Button>
        <TextField
          label="Test Email To"
          size="small"
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          sx={{ minWidth: 200, background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
        />
        <Button variant="outlined" onClick={handleTest} disabled={loading || !testEmail}
          sx={{
            minWidth: 70,
            height: 32,
            borderRadius: 2,
            fontWeight: 500,
            fontSize: 12,
            textTransform: 'none',
            px: 1.2,
            color: '#4A69D9',
            border: '1.5px solid #4A69D9',
            background: '#fff',
            boxShadow: 'none',
            '&:hover': {
              background: '#f7f8fa',
              border: '1.5px solid #5673DC',
              color: '#5673DC',
            },
          }}
        >
          Test Connection
        </Button>
      </Box>
      {saveResult && (
        <Alert severity={saveResult.success ? 'success' : 'error'} sx={{ mb: 1 }}>{saveResult.message}</Alert>
      )}
      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'}>{testResult.message}</Alert>
      )}
    </Box>
  );
}

export default SMTPSettings; 