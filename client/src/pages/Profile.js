import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  LinearProgress,
  Grid,
  Paper
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Profile data is reloaded when the signed-in user changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    axios.get(`/api/users/${user.id}`)
      .then(res => {
        setProfile(res.data);
        setAvatarPreview(res.data.avatar_url || '');
        setLoading(false);
      })
      .catch(err => {
        setError(t('profile.errors.load')); 
        setLoading(false);
      });
  }, [user, t]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await axios.patch(`/api/users/${user.id}`, profile);
      setSuccess(t('profile.updated')); 
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'profile.errors.update')); 
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    // Show preview immediately
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post('/api/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => ({ ...prev, avatar_url: res.data.url }));
      // Optionally revoke the local URL after upload
      setTimeout(() => URL.revokeObjectURL(localUrl), 1000);
      setAvatarPreview(res.data.url);
    } catch (err) {
      setUploadError(t('profile.errors.upload')); 
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ minHeight: '100vh', py: 4, px: { xs: 1, sm: 4 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#5673DC' }}>{t('profile.title')}</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Paper elevation={1} sx={{ p: { xs: 2, sm: 4 }, border: '1px solid #E2E4E9', borderRadius: '12px', maxWidth: 1200, width: '100%', mx: 'auto' }}>
        <Grid container spacing={4} alignItems="flex-start">
          <Grid item xs={12} md={4}>
            <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
              <Avatar
                src={avatarPreview || ''}
                alt={profile.name || 'Avatar'}
                sx={{ width: 110, height: 110, bgcolor: '#e0e0e0', fontSize: 40, border: '2px solid #8196E4' }}
              >
                {(!avatarPreview && profile.name) ? profile.name[0] : ''}
              </Avatar>
              <Button
                variant="outlined"
                component="label"
                sx={{ fontWeight: 500, borderRadius: 2, color: '#5673DC', borderColor: '#8196E4', background: '#F5F7FE', '&:hover': { background: '#E2E4E9' } }}
              >
                Upload Avatar
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileChange}
                />
              </Button>
              {uploading && <LinearProgress sx={{ width: '100%', mt: 1 }} />}
              {uploadError && <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>}
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Name"
                  name="name"
                  value={profile.name || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Surname"
                  name="surname"
                  value={profile.surname || ''}
                  onChange={handleChange}
                  fullWidth
                  required
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  name="email"
                  value={profile.email || ''}
                  InputProps={{ readOnly: true }}
                  fullWidth
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  name="phone"
                  value={profile.phone || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Department"
                  name="department"
                  value={profile.department || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Job Title"
                  name="job_title"
                  value={profile.job_title || ''}
                  onChange={handleChange}
                  fullWidth
                  sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 15, borderRadius: 2, background: '#f7f8fa' } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  sx={{ mt: 2, background: '#8196E4', color: '#fff', fontWeight: 600, borderRadius: 2, fontSize: 16, boxShadow: 3, textTransform: 'none', px: 4, py: 1, '&:hover': { background: '#4A69D9' } }}
                  onClick={handleSave}
                  disabled={saving}
                  fullWidth
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
} 