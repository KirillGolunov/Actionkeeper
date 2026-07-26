import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import projectBudgetOverviewPreview from '../assets/announcement-project-budget-overview.jpg';

const ANNOUNCEMENT_ID = 'project-budget-and-rates-analytics-update-v2';

function getDismissedKey(email) {
  return `product-update-dismissed:${ANNOUNCEMENT_ID}:${email}`;
}

function getSessionSeenKey(email) {
  return `product-update-seen:${ANNOUNCEMENT_ID}:${email}`;
}

function ProjectBudgetAnnouncement({ t }) {
  const changeItems = [
    t('updates.projectBudget.rateAccounting'),
    t('updates.projectBudget.financialAccess'),
    t('updates.projectBudget.privacy'),
    t('updates.projectBudget.openFromCard'),
  ];

  return (
    <>
      <Typography sx={{ mb: 2 }}>
        {t('updates.projectBudget.intro')}
      </Typography>
      <Box
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: '#F5F7FF',
          border: '1px solid #D8E0FF',
          mb: 2,
        }}
      >
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {t('updates.projectBudget.whatChanged')}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {changeItems.map((item) => (
            <Typography
              component="li"
              key={item}
              sx={{ fontSize: 14, lineHeight: 1.45, mb: 0.65, '&:last-child': { mb: 0 } }}
            >
              {item}
            </Typography>
          ))}
        </Box>
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {t('updates.projectBudget.previewTitle')}
        </Typography>
        <Box
          component="img"
          src={projectBudgetOverviewPreview}
          alt={t('updates.projectBudget.previewAlt')}
          sx={{
            display: 'block',
            width: '100%',
            height: 'auto',
            borderRadius: 3,
            border: '1px solid #DCE3F2',
            boxShadow: '0 10px 24px rgba(34, 40, 54, 0.08)',
            backgroundColor: '#F8FAFF',
          }}
        />
      </Box>
    </>
  );
}

export default function AutoLoginInfoDialog() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setOpen(false);
      setDontShowAgain(false);
      return;
    }

    const dismissed = localStorage.getItem(getDismissedKey(user.email)) === '1';
    const seenThisSession = sessionStorage.getItem(getSessionSeenKey(user.email)) === '1';
    setOpen(!dismissed && !seenThisSession);
    setDontShowAgain(false);
  }, [isAuthenticated, user?.email]);

  const handleClose = () => {
    if (user?.email) {
      sessionStorage.setItem(getSessionSeenKey(user.email), '1');
      if (dontShowAgain) {
        localStorage.setItem(getDismissedKey(user.email), '1');
      }
    }
    setOpen(false);
    setDontShowAgain(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{t('updates.projectBudget.title')}</DialogTitle>
      <DialogContent>
        <ProjectBudgetAnnouncement t={t} />
        <FormControlLabel
          sx={{ mt: 2 }}
          control={(
            <Checkbox
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
            />
          )}
          label={t('autologin.doNotShowAgain')}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={handleClose}>
          {t('autologin.gotIt')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
