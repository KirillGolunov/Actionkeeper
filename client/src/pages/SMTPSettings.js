import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Typography, Switch, FormControlLabel, Alert } from '@mui/material';
import axios from 'axios';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

const SAVED_PASSWORD_MASK = '********';

function SMTPSettings() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState({
    host: '',
    port: 587,
    user: '',
    pass: '',
    from: '',
    secure: false,
    hasPassword: false,
  });
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  useEffect(() => {
    axios.get('/api/smtp-settings').then(res => {
      const user = res.data.user || res.data.auth?.user || '';
      const hasPassword =
        !!res.data.hasPassword ||
        !!res.data.pass ||
        !!res.data.auth?.pass ||
        !!(res.data.host && user && res.data.from);
      setSettings(current => ({
        ...current,
        host: res.data.host || '',
        port: res.data.port || 587,
        user,
        pass: hasPassword ? SAVED_PASSWORD_MASK : '',
        from: res.data.from || '',
        secure: !!res.data.secure,
        hasPassword,
      }));
    });
  }, []);

  const handleChange = (field, value) => {
    setSettings(s => ({ ...s, [field]: value }));
  };

  const handleSave = async () => {
    setSaveResult(null);
    setLoading(true);
    try {
      await axios.post('/api/smtp-settings', {
        host: settings.host,
        port: settings.port,
        user: settings.user,
        pass: settings.pass === SAVED_PASSWORD_MASK ? '' : settings.pass,
        from: settings.from,
        secure: settings.secure,
      });
      setSettings(s => ({ ...s, pass: '', hasPassword: true }));
      setSaveResult({ success: true, message: t('smtp.settingsSaved') });
    } catch (err) {
      setSaveResult({ success: false, message: getApiErrorMessage(err, t, 'smtp.saveFailed') });
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
        user: settings.user,
        pass: settings.pass === SAVED_PASSWORD_MASK ? '' : settings.pass,
        from: settings.from,
        secure: settings.secure,
        to: testEmail,
      });
      setTestResult({ success: true, message: t('smtp.testSent') });
    } catch (err) {
      setTestResult({ success: false, message: getApiErrorMessage(err, t, 'smtp.testFailed') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 500, mx: 'auto', mt: 4, p: 3, border: '1px solid #E2E4E9', borderRadius: 3, background: '#fff' }}>
      <Typography variant="h5" sx={{ mb: 2 }}>{t('smtp.title')}</Typography>
      <TextField label={t('smtp.host')} fullWidth margin="normal" value={settings.host} onChange={e => handleChange('host', e.target.value)} sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
      <TextField label={t('smtp.port')} type="number" fullWidth margin="normal" value={settings.port} onChange={e => handleChange('port', e.target.value === '' ? '' : parseInt(e.target.value, 10))} sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
      <TextField label={t('smtp.username')} fullWidth margin="normal" value={settings.user} onChange={e => handleChange('user', e.target.value)} sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
      <TextField label={t('smtp.password')} type="password" fullWidth margin="normal" value={settings.pass} onFocus={() => { if (settings.pass === SAVED_PASSWORD_MASK) handleChange('pass', ''); }} onChange={e => handleChange('pass', e.target.value)} placeholder={settings.hasPassword ? t('smtp.passwordPlaceholder') : undefined} helperText={settings.hasPassword ? t('smtp.passwordHint') : undefined} sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
      <TextField label={t('smtp.fromAddress')} fullWidth margin="normal" value={settings.from} onChange={e => handleChange('from', e.target.value)} sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
      <FormControlLabel control={<Switch checked={!!settings.secure} onChange={e => handleChange('secure', e.target.checked)} />} label={t('smtp.useSecure')} sx={{ mt: 1, mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Button variant="contained" color="primary" onClick={handleSave} disabled={loading} sx={{ minWidth: 70, height: 32, borderRadius: 2, fontWeight: 500, fontSize: 12, textTransform: 'none', px: 1.2, backgroundColor: '#8196E4', color: '#FFFFFF', boxShadow: 3, '&:hover': { backgroundColor: '#4A69D9' } }}>
          {t('common.actions.save')}
        </Button>
        <TextField label={t('smtp.testEmailTo')} size="small" value={testEmail} onChange={e => setTestEmail(e.target.value)} sx={{ minWidth: 200, background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }} />
        <Button variant="outlined" onClick={handleTest} disabled={loading || !testEmail} sx={{ minWidth: 70, height: 32, borderRadius: 2, fontWeight: 500, fontSize: 12, textTransform: 'none', px: 1.2, color: '#4A69D9', border: '1.5px solid #4A69D9', background: '#fff', boxShadow: 'none', '&:hover': { background: '#f7f8fa', border: '1.5px solid #5673DC', color: '#5673DC' } }}>
          {t('smtp.testConnection')}
        </Button>
      </Box>
      {saveResult && <Alert severity={saveResult.success ? 'success' : 'error'} sx={{ mb: 1 }}>{saveResult.message}</Alert>}
      {testResult && <Alert severity={testResult.success ? 'success' : 'error'}>{testResult.message}</Alert>}
    </Box>
  );
}

export default SMTPSettings;
