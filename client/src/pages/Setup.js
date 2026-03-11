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
  Checkbox,
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function Setup() {
  const { t } = useTranslation();
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
      setSuccess(t('setup.completeSuccess'));
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'setup.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setTestEmailStatus(null);
    setTestEmailLoading(true);
    try {
      await axios.post('/api/smtp-test', { ...smtp, to: admin.email });
      setTestEmailStatus({ type: 'success', msg: t('setup.testSuccess') });
    } catch (err) {
      setTestEmailStatus({ type: 'error', msg: getApiErrorMessage(err, t, 'setup.testFailed') });
    } finally {
      setTestEmailLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', py: 2, px: { xs: 1, sm: 2 } }}>
      <Paper elevation={1} sx={{ border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: 1, maxWidth: 650, mx: 'auto', p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#5673DC' }}>{t('setup.title')}</Typography>
        </Box>
        <Typography variant="body1" sx={{ mb: 2, color: '#222', fontSize: 14, lineHeight: 1.6 }}>
          <b>{t('setup.introTitle')}</b><br />
          {t('setup.introBody')}
        </Typography>
        {!isProduction && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {t('setup.localDevTip')}
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }}>{success}</Alert>}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: '#5673DC' }}>{t('setup.adminSection')}</Typography>
              <TextField label={t('fields.name')} name="name" value={admin.name} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.surname')} name="surname" value={admin.surname} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.email')} name="email" value={admin.email} onChange={handleAdminChange} fullWidth required size="small" sx={{ mb: 1 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1, color: '#5673DC' }}>{t('setup.smtpSection')}</Typography>
              <TextField label={t('fields.host')} name="host" value={smtp.host} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.port')} name="port" value={smtp.port} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.user')} name="user" value={smtp.user} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.password')} name="pass" value={smtp.pass} onChange={handleSmtpChange} type="password" fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <TextField label={t('fields.fromEmail')} name="from" value={smtp.from} onChange={handleSmtpChange} fullWidth required={isProduction} size="small" sx={{ mb: 1 }} />
              <FormControlLabel
                control={<Checkbox name="secure" checked={smtp.secure} onChange={handleSmtpChange} size="small" />}
                label={<span style={{ fontSize: 14 }}>{t('setup.secure')}</span>}
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
                {testEmailLoading ? t('setup.sending') : t('setup.sendTestEmail')}
              </Button>
              {testEmailStatus && <Alert severity={testEmailStatus.type} sx={{ mt: 0.5, fontSize: 14 }}>{testEmailStatus.msg}</Alert>}
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
                {loading ? t('setup.settingUp') : t('setup.completeSetup')}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
}
