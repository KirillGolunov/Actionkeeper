import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, TextField, Button, Alert, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function AcceptInvitation() {
  const { t } = useTranslation();
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
        setError(getApiErrorMessage(err, t, 'auth.invitation.invalidOrExpired'));
        setLoading(false);
      }
    };
    fetchInvitation();
  }, [token, t]);

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
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'auth.invitation.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0, background: '#F7F8FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, minWidth: 470, maxWidth: 520 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#5673DC', mb: 1.5, fontSize: 22 }}>{t('auth.invitation.title')}</Typography>
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontSize: 17, color: '#222', fontWeight: 700, mb: 0.8 }}>{t('auth.invitation.welcome')}</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>{t('auth.invitation.description1')}</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>{t('auth.invitation.description2')}</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mb: 0.8 }}>{t('auth.invitation.description3')}</Typography>
          <Typography sx={{ fontSize: 13.5, color: '#444', mt: 1.2 }}>{t('auth.invitation.description4')}</Typography>
        </Box>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {success ? (
          <Alert severity="success">{t('auth.invitation.success')}</Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <TextField label={t('fields.name')} name="name" value={form.name} onChange={handleChange} fullWidth required size="small" sx={{ mb: 1.2 }} InputLabelProps={{ style: { fontSize: 14 } }} inputProps={{ style: { fontSize: 15 } }} />
            <TextField label={t('fields.surname')} name="surname" value={form.surname} onChange={handleChange} fullWidth required size="small" sx={{ mb: 1.2 }} InputLabelProps={{ style: { fontSize: 14 } }} inputProps={{ style: { fontSize: 15 } }} />
            <TextField label={t('fields.email')} value={form.email} fullWidth InputProps={{ readOnly: true, style: { fontSize: 15 } }} InputLabelProps={{ style: { fontSize: 14 } }} size="small" sx={{ mb: 1.2 }} />
            <Typography sx={{ fontSize: 12, color: '#888', mb: 1.2 }}>{t('auth.invitation.emailHint')}</Typography>
            <Button type="submit" variant="contained" fullWidth sx={{ background: '#5673DC', fontWeight: 600, fontSize: 15, borderRadius: 2, height: 38, minHeight: 36, '&:hover': { background: '#4A69D9' }, mt: 0.5 }} disabled={submitting}>
              {submitting ? t('auth.invitation.submitting') : t('auth.invitation.submit')}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
}
