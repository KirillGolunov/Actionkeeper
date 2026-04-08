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

function renderProjectAnalyticsAnnouncement(locale) {
  const isRu = locale === 'ru';

  return (
    <>
      <Typography sx={{ mb: 2 }}>
        {isRu
          ? 'В TimeTracker появилась новая аналитика проектов с быстрым доступом из карточек проектов и из таблицы на дашборде.'
          : 'TimeTracker now includes new project analytics with quick access from project cards and from the dashboard table.'}
      </Typography>
      <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#F5F7FF', border: '1px solid #D8E0FF', mb: 2 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {isRu ? 'Что появилось' : 'What is new'}
        </Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>
          {isRu
            ? 'У каждого проекта теперь есть окно аналитики с общей сводкой: участники, всего часов, среднее в день и последняя активность.'
            : 'Each project now has an analytics view with a quick summary: participants, total hours, average per day, and last activity.'}
        </Typography>
        <Typography sx={{ fontSize: 14, mb: 0.75 }}>
          {isRu
            ? 'На графике можно переключать период, смотреть динамику по участникам и анализировать общую линию часов по проекту.'
            : 'The chart lets you switch periods, inspect member activity, and analyze the overall hours trend for the project.'}
        </Typography>
        <Typography sx={{ fontSize: 14 }}>
          {isRu
            ? 'Открыть аналитику можно по кнопке с иконкой графика на странице Projects и в таблице "Часы по проектам" на Dashboard.'
            : 'You can open analytics from the chart icon button on the Projects page and from the "Hours by Project" table on the Dashboard.'}
        </Typography>
      </Box>
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>
          {isRu ? 'Как это выглядит' : 'How it looks'}
        </Typography>
        <Box
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid #DCE3F2',
            backgroundColor: '#FFFFFF',
            boxShadow: '0 10px 24px rgba(34, 40, 54, 0.08)',
          }}
        >
          <Box sx={{ px: 1.5, py: 1.2, borderBottom: '1px solid #EDF1F7', backgroundColor: '#FBFCFF' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#1D2433', lineHeight: 1.2 }}>
              {isRu ? 'Аналитика проекта' : 'Project analytics'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#1D2433', mt: 0.35, lineHeight: 1.2 }}>
              Project with a very long project name
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: '#7A869A', mt: 0.25 }}>
              Acme Corp / AA0001 / 13
            </Typography>
          </Box>

          <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #EDF1F7', display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Box sx={{ px: 1.2, py: 0.45, borderRadius: 2, border: '1.5px solid #E2E4E9', color: '#222', fontSize: 10.5 }}>
                {isRu ? 'По дням' : 'By day'}
              </Box>
              <Box sx={{ px: 1.2, py: 0.45, borderRadius: 2, border: '1.5px solid #5673DC', color: '#5673DC', backgroundColor: 'rgba(86,115,220,0.06)', fontSize: 10.5 }}>
                {isRu ? 'Нарастающим итогом' : 'Cumulative'}
              </Box>
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#1D2433', alignSelf: 'center' }}>
              {isRu ? 'Все время' : 'All time'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.55 }}>
              {['Week', 'Month', 'Quarter', 'Year', 'All'].map((label, index) => (
                <Box
                  key={label}
                  sx={{
                    px: 0.9,
                    py: 0.45,
                    borderRadius: 2,
                    border: index === 4 ? '1.5px solid #5673DC' : '1.5px solid #E2E4E9',
                    color: index === 4 ? '#5673DC' : '#222',
                    backgroundColor: index === 4 ? 'rgba(86,115,220,0.06)' : '#F7F8FA',
                    fontSize: 10.25,
                    minWidth: 42,
                    textAlign: 'center',
                  }}
                >
                  {isRu
                    ? ['Неделя', 'Месяц', 'Квартал', 'Год', 'Все время'][index]
                    : label}
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ px: 1.5, py: 1.1, borderBottom: '1px solid #EDF1F7', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.75 }}>
            {[
              [isRu ? 'Участники' : 'Participants', '7'],
              [isRu ? 'Всего часов' : 'Total hours', '102 h'],
              [isRu ? 'Среднее в день' : 'Average per day', '6 h'],
              [isRu ? 'Последняя активность' : 'Last activity', isRu ? '7 апр. 2026' : '7 Apr 2026'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ border: '1px solid #E2E4E9', borderRadius: 2.5, px: 1, py: 0.85 }}>
                <Typography sx={{ fontSize: 10.5, color: '#7A869A', lineHeight: 1.1 }}>{label}</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: '#1D2433', mt: 0.35 }}>{value}</Typography>
              </Box>
            ))}
          </Box>

          <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: '150px 1fr', gap: 1.2, backgroundColor: '#FFFFFF' }}>
            <Box sx={{ border: '1px solid #E2E4E9', borderRadius: 2.5, p: 1 }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#1D2433', mb: 0.7 }}>
                {isRu ? 'Участники' : 'Members'}
              </Typography>
              {[
                ['#1F3A5F', isRu ? 'Итого' : 'Total'],
                ['#5673DC', 'Johnson Alice'],
                ['#FF8A65', 'Brown Charlie'],
                ['#4DB6AC', 'Smith Bob'],
              ].map(([color, name]) => (
                <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.7 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: 0.7, border: '1px solid #9AA6BA', backgroundColor: '#FFFFFF' }} />
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color }} />
                  <Typography sx={{ fontSize: 10.5, color: '#1D2433', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ border: '1px solid #E2E4E9', borderRadius: 2.5, p: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#1D2433' }}>
                  {isRu ? 'График часов' : 'Hours chart'}
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: '#7A869A' }}>
                  {isRu ? 'Накоплено: 102 ч' : 'Accumulated: 102 h'}
                </Typography>
              </Box>
              <Box sx={{ position: 'relative', height: 132, borderRadius: 2, background: 'linear-gradient(180deg, #FBFCFF 0%, #FFFFFF 100%)', overflow: 'hidden' }}>
                {[24, 52, 80, 108].map((top) => (
                  <Box key={top} sx={{ position: 'absolute', left: 0, right: 0, top, borderTop: '1px solid #EEF1F6' }} />
                ))}
                <Box
                  sx={{
                    position: 'absolute',
                    inset: '18px 10px 14px 10px',
                    '& svg': { width: '100%', height: '100%' },
                  }}
                >
                  <svg viewBox="0 0 420 100" preserveAspectRatio="none">
                    <polyline fill="none" stroke="#5673DC" strokeOpacity="0.28" strokeWidth="1.5" points="0,88 80,88 120,84 170,84 250,84 320,84 380,82 420,80" />
                    <polyline fill="none" stroke="#FF8A65" strokeOpacity="0.28" strokeWidth="1.5" points="0,86 120,86 180,74 250,74 330,72 420,72" />
                    <polyline fill="none" stroke="#4DB6AC" strokeOpacity="0.28" strokeWidth="1.5" points="0,90 210,90 280,82 350,82 420,76" />
                    <polyline fill="none" stroke="#1F3A5F" strokeWidth="3" points="0,72 90,72 150,66 230,60 300,56 360,48 420,32" />
                  </svg>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
}

export default function AutoLoginInfoDialog() {
  const { user, isAuthenticated, sessionStatus } = useAuth();
  const { t, locale } = useTranslation();
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
      id: 'project-analytics-update',
      title: locale === 'ru' ? 'Новая аналитика проектов' : 'New project analytics',
      confirmLabel: locale === 'ru' ? 'Понятно' : 'Got it',
      dontShowLabel: locale === 'ru' ? 'Больше не показывать' : 'Do not show this again',
      renderContent: () => renderProjectAnalyticsAnnouncement(locale),
    },
    {
      id: 'ru-localization',
      title: 'Новое в интерфейсе',
      confirmLabel: 'Понятно',
      dontShowLabel: 'Больше не показывать',
      renderContent: renderLocalizationAnnouncement,
    },
  ]), [locale, progress, t]);

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
