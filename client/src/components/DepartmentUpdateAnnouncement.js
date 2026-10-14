import React from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';

export const DEPARTMENT_UPDATE_ANNOUNCEMENT_ID = 'department-support-v1';

export default function DepartmentUpdateAnnouncement() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || !user?.id) {
      setOpen(false);
      return undefined;
    }
    axios.get(`/api/product-updates/${DEPARTMENT_UPDATE_ANNOUNCEMENT_ID}`)
      .then(({ data }) => { if (!cancelled) setOpen(Boolean(data.eligible && !data.dismissed && !data.completed)); })
      .catch(() => { if (!cancelled) setOpen(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, user?.id]);

  const dismiss = async () => {
    setSaving(true);
    setError('');
    try {
      await axios.post(`/api/product-updates/${DEPARTMENT_UPDATE_ANNOUNCEMENT_ID}`, { action: 'dismiss' });
      setOpen(false);
    } catch {
      setError(t('productUpdate.departments.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return <Dialog
    open={open}
    onClose={saving ? undefined : dismiss}
    fullWidth
    maxWidth="sm"
    aria-labelledby="department-update-title"
    PaperProps={{ sx: { borderRadius: { xs: 0, sm: '14px' }, overflow: 'hidden', background: '#FBFCFF' } }}
  >
    <DialogTitle id="department-update-title" sx={{ px: { xs: 2.5, sm: 3 }, pt: 3, pb: 1, color: '#1D2433', fontWeight: 700, fontSize: { xs: 21, sm: 24 }, lineHeight: 1.25 }}>
      {t('productUpdate.departments.title')}
    </DialogTitle>
    <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: '8px !important', pb: 2 }}>
      <Typography sx={{ color: '#475467', fontSize: 15, lineHeight: 1.65, mb: 1.5 }}>
        {t('productUpdate.departments.intro')}
      </Typography>
      <Typography sx={{ color: '#475467', fontSize: 15, lineHeight: 1.65, mb: 1.5 }}>
        {t('productUpdate.departments.timeEntry')}
      </Typography>
      <Typography sx={{ color: '#475467', fontSize: 15, lineHeight: 1.65 }}>
        {t('productUpdate.departments.projects')}
      </Typography>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
    </DialogContent>
    <DialogActions sx={{ px: { xs: 2.5, sm: 3 }, pb: 2.5, pt: 0 }}>
      <Button variant="contained" onClick={dismiss} disabled={saving} sx={{ minHeight: 40, px: 2.5, borderRadius: '10px', bgcolor: '#5673DC', textTransform: 'none', '&:hover': { bgcolor: '#4256B2' } }}>
        {t('productUpdate.departments.acknowledge')}
      </Button>
    </DialogActions>
  </Dialog>;
}
