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

function getDismissedKey(email, announcementId) {
  if (announcementId === 'autologin') {
    return `autologin-info-dismissed:${email}`;
  }
  return `product-update-dismissed:${announcementId}:${email}`;
}

function getSessionSeenKey(email, announcementId) {
  if (announcementId === 'autologin') {
    return `autologin-info-seen:${email}`;
  }
  return `product-update-seen:${announcementId}:${email}`;
}

function renderAutoLoginAnnouncement(t, progress) {
  return (
    <>
      <Typography sx={{ mb: 2 }}>
        {t('autologin.dialogIntro')}
      </Typography>
      <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#F5F7FF', border: '1px solid #D8E0FF', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>{t('autologin.howItWorks')}</Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>{t('autologin.rule1')}</Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>{t('autologin.rule2')}</Typography>
        <Typography sx={{ fontSize: 14 }}>{t('autologin.rule3')}</Typography>
      </Box>
      {progress && (
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#FAFAFA', border: '1px solid #E6E6E6' }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>{t('autologin.currentProgress')}</Typography>
          <Typography sx={{ fontSize: 14, mb: 1.25 }}>
            {t('autologin.currentProgressValue', { completed: progress.completedDays, required: progress.requiredDays })}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {progress.days.map((day) => (
              <Box key={day.date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 34 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 10,
                    borderRadius: 999,
                    backgroundColor: day.complete ? '#9BE7B1' : day.isToday ? '#FFD36E' : '#D7DCE5',
                    outline: day.isToday ? '1px solid #5673DC' : 'none',
                    outlineOffset: 1,
                  }}
                />
                <Typography sx={{ fontSize: 11, mt: 0.5 }}>{day.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}

function renderLocalizationAnnouncement() {
  return (
    <>
      <Typography sx={{ mb: 2 }}>
        {'Интерфейс TimeTracker теперь доступен на русском языке.'}
      </Typography>
      <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#F5F7FF', border: '1px solid #D8E0FF', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {'Что изменилось'}
        </Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>
          {'Переведены основные разделы, формы, кнопки, дашборды и системные подсказки.'}
        </Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>
          {'Улучшены тексты ошибок и уведомлений в ключевых сценариях.'}
        </Typography>
        <Typography sx={{ fontSize: 14 }}>
          {'Если заметите непереведённый текст, его можно будет добить в следующих обновлениях.'}
        </Typography>
      </Box>
    </>
  );
}

export default function AutoLoginInfoDialog() {
  const { user, isAuthenticated, sessionStatus } = useAuth();
  const { t } = useTranslation();
  const [queue, setQueue] = React.useState([]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  const progress = sessionStatus?.progress;

  const announcements = React.useMemo(() => ([
    {
      id: 'autologin',
      title: t('autologin.dialogTitle'),
      confirmLabel: t('autologin.gotIt'),
      dontShowLabel: t('autologin.doNotShowAgain'),
      renderContent: () => renderAutoLoginAnnouncement(t, progress),
    },
    {
      id: 'ru-localization',
      title: 'Новое в интерфейсе',
      confirmLabel: 'Понятно',
      dontShowLabel: 'Больше не показывать',
      renderContent: renderLocalizationAnnouncement,
    },
  ]), [progress, t]);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setQueue([]);
      setActiveIndex(0);
      setDontShowAgain(false);
      return;
    }

    const pending = announcements.filter((announcement) => {
      const dismissed = localStorage.getItem(getDismissedKey(user.email, announcement.id)) === '1';
      const seenThisSession = sessionStorage.getItem(getSessionSeenKey(user.email, announcement.id)) === '1';
      return !dismissed && !seenThisSession;
    });

    setQueue(pending);
    setActiveIndex(0);
    setDontShowAgain(false);
  }, [announcements, isAuthenticated, user?.email]);

  const activeAnnouncement = queue[activeIndex] || null;
  const open = Boolean(activeAnnouncement);

  const handleClose = () => {
    if (!activeAnnouncement || !user?.email) {
      setQueue([]);
      setActiveIndex(0);
      setDontShowAgain(false);
      return;
    }

    sessionStorage.setItem(getSessionSeenKey(user.email, activeAnnouncement.id), '1');
    if (dontShowAgain) {
      localStorage.setItem(getDismissedKey(user.email, activeAnnouncement.id), '1');
    }

    const nextIndex = activeIndex + 1;
    if (nextIndex < queue.length) {
      setActiveIndex(nextIndex);
      setDontShowAgain(false);
      return;
    }

    setQueue([]);
    setActiveIndex(0);
    setDontShowAgain(false);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{activeAnnouncement?.title}</DialogTitle>
      <DialogContent>
        {activeAnnouncement?.renderContent()}
        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Checkbox checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />}
          label={activeAnnouncement?.dontShowLabel}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={handleClose}>{activeAnnouncement?.confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}
