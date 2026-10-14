import React, { useEffect, useState } from 'react';
import { Box, IconButton, Portal, Snackbar, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../i18n/I18nProvider';

export default function ProductErrorToast({ message, onClose }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!!message);
  useEffect(() => { setOpen(!!message); }, [message]);
  const close = (_event, reason) => { if (reason === 'clickaway') return; setOpen(false); onClose?.(); };
  return <Portal><Snackbar open={open} onClose={close} autoHideDuration={8000} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} sx={{ zIndex: theme => theme.zIndex.modal + 2000, bottom: '24px !important', right: { xs: '16px !important', sm: '24px !important' }, left: { xs: '16px !important', sm: 'auto !important' } }}>
    <Box role="alert" sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, position: 'relative', p: 1.75, pr: 4, width: { xs: '100%', sm: 360 }, maxWidth: 'calc(100vw - 32px)', boxSizing: 'border-box', borderRadius: '8px', background: '#D80000', color: '#FFFFFF', boxShadow: '0 8px 24px rgba(29,36,51,.18)', overflow: 'hidden' }}>
      <WarningIcon sx={{ fontSize: 24, mt: 0.125 }} />
      <Box sx={{ minWidth: 0, flex: 1 }}><Typography sx={{ fontSize: 14, fontWeight: 500, mb: 0.25 }}>{t('projectMenus.errorTitle')}</Typography><Typography sx={{ fontSize: 12, lineHeight: 1.45, whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{message}</Typography></Box>
      <IconButton size="small" aria-label={t('common.actions.close')} onClick={close} sx={{ position: 'absolute', top: 8, right: 8, color: 'inherit', p: 0.25 }}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
      <Box sx={{ position: 'absolute', height: 3, bottom: 0, left: 0, width: '100%', background: 'rgba(255,255,255,.6)', transformOrigin: 'left', animation: 'toast-countdown 8s linear forwards', '@keyframes toast-countdown': { from: { transform: 'scaleX(1)' }, to: { transform: 'scaleX(0)' } } }} />
    </Box>
  </Snackbar></Portal>;
}
