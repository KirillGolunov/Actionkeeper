import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';

export const MAJOR_UPDATE_ANNOUNCEMENT_ID = 'major-update-guided-tour-v1';

export default function MajorUpdateAnnouncement({ onStartTour }) {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const sessionKey = user?.id ? `product-update-later:${MAJOR_UPDATE_ANNOUNCEMENT_ID}:${user.id}` : '';

  React.useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setOpen(false);
      return undefined;
    }
    axios.get(`/api/product-updates/${MAJOR_UPDATE_ANNOUNCEMENT_ID}`).then(({ data }) => {
      if (!cancelled) setOpen(Boolean(data.eligible && !data.dismissed && !data.completed && sessionStorage.getItem(sessionKey) !== '1'));
    }).catch(() => { if (!cancelled) setOpen(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, sessionKey, user?.id]);

  const later = () => {
    sessionStorage.setItem(sessionKey, '1');
    setOpen(false);
  };
  const dismiss = async () => {
    setOpen(false);
    await axios.post(`/api/product-updates/${MAJOR_UPDATE_ANNOUNCEMENT_ID}`, { action: 'dismiss' }).catch(() => setOpen(true));
  };
  const start = () => {
    setOpen(false);
    onStartTour?.();
  };

  if (!open) return null;
  return <Paper data-product-tour-announcement="true" role="dialog" aria-label={t('productTour.announcement.title')} elevation={8} sx={{ position: 'fixed', zIndex: 1200, right: { xs: 12, sm: 24 }, bottom: { xs: 12, sm: 24 }, width: { xs: 'calc(100% - 24px)', sm: 390 }, p: 2, borderRadius: 3, border: '1px solid #DCE4FA', boxShadow: '0 16px 38px rgba(29,36,51,.20)' }}>
    <Typography sx={{ fontSize: 16, fontWeight: 700, color: '#1D2433', mb: 0.5 }}>{t('productTour.announcement.title')}</Typography>
    <Typography sx={{ fontSize: 13, lineHeight: 1.45, color: '#667085', mb: 1.5 }}>{t('productTour.announcement.description')}</Typography>
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
      <Button size="small" onClick={dismiss} sx={{ color: '#667085', fontWeight: 400, textTransform: 'none' }}>{t('productTour.announcement.dismiss')}</Button>
      <Button size="small" onClick={later} sx={{ color: '#4A68D9', fontWeight: 500, textTransform: 'none' }}>{t('productTour.announcement.later')}</Button>
      <Button size="small" variant="contained" onClick={start} sx={{ ml: 'auto', textTransform: 'none', bgcolor: '#4A68D9', '&:hover': { bgcolor: '#3E5BC7' } }}>{t('productTour.announcement.view')}</Button>
    </Box>
  </Paper>;
}
