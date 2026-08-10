import React, { useMemo } from 'react';
import {
  Avatar, Box, Button, CircularProgress, Divider, IconButton, Modal, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import { useTranslation } from '../i18n/I18nProvider';
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH, SIDEBAR_PADDING } from './sidebarDimensions';

export default function NotificationPanel({
  open, collapsed, items, unreadCount, loading, hasMore, onClose, onReadAll, onItemClick, onLoadMore,
}) {
  const { t, locale } = useTranslation();
  const grouped = useMemo(() => items.reduce((acc, item) => {
    const date = new Date(item.createdAt);
    const key = date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {}), [items, locale]);

  const getText = (notification) => {
    const keys = {
      project_manager_assigned: 'notifications.projectManagerAssigned',
      project_manager_removed: 'notifications.projectManagerRemoved',
      project_payroll_warning: 'notifications.projectPayrollWarning',
      project_payroll_limit_reached: 'notifications.projectPayrollLimitReached',
      project_budget_change_requested: 'notifications.projectBudgetChangeRequested',
      project_budget_change_updated: 'notifications.projectBudgetChangeUpdated',
      project_budget_change_approved: 'notifications.projectBudgetChangeApproved',
      project_budget_change_rejected: 'notifications.projectBudgetChangeRejected',
      project_budget_request_transferred: 'notifications.projectBudgetRequestTransferred',
    };
    return t(keys[notification.type] || 'notifications.unknown', {
      project: notification.project?.name || '',
      threshold: notification.thresholdPercent ?? '',
      revision: notification.metadata?.revision ?? '',
      version: notification.metadata?.version ?? '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="notifications-panel-title" closeAfterTransition>
      <Box
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-panel-title"
        sx={{
          position: 'fixed',
          left: { xs: 12, md: (collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH) + SIDEBAR_PADDING },
          top: { xs: 12, md: 16 },
          width: { xs: 'calc(100vw - 24px)', md: 420 },
          height: { xs: 'calc(100dvh - 24px)', md: 'min(600px, calc(100dvh - 32px))' },
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 22px 55px rgba(24,36,72,.24)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'left 200ms ease',
          outline: 'none',
        }}
      >
        <Box sx={{ height: 52, px: 1.5, display: 'flex', alignItems: 'center', borderBottom: '1px solid #F0F2F4', flexShrink: 0 }}>
          <Typography id="notifications-panel-title" sx={{ fontWeight: 700, fontSize: 15, color: '#0B0C0F', flex: 1 }}>
            {t('notifications.title')}
          </Typography>
          {unreadCount > 0 && (
            <Button onClick={onReadAll} size="small" sx={{ color: '#586174', textTransform: 'none', fontSize: 12, mr: 0.5 }}>
              {t('notifications.readAll')}
            </Button>
          )}
          <IconButton onClick={onClose} size="small" aria-label={t('common.actions.close')} sx={{ border: '1px solid #E5E8EE' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {loading && items.length === 0 ? (
            <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
          ) : items.length === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#424957' }}>
              <NotificationsNoneRoundedIcon sx={{ fontSize: 42, color: '#7F899E', mb: 1.5 }} />
              <Typography>{t('notifications.empty')}</Typography>
            </Box>
          ) : Object.entries(grouped).map(([group, notifications]) => (
            <Box key={group}>
              <Typography sx={{ px: 1.5, py: 0.75, fontSize: 12, color: '#586174', textTransform: 'capitalize', background: '#FBFCFE' }}>
                {group}
              </Typography>
              {notifications.map((notification) => {
                const actorName = [notification.actor?.surname, notification.actor?.name].filter(Boolean).join(' ');
                const initials = actorName.split(' ').map((part) => part[0]).join('').slice(0, 2);
                return (
                  <React.Fragment key={notification.id}>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => onItemClick(notification)}
                      sx={{
                        width: '100%', border: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer',
                        px: 1.5, py: 1.15, display: 'grid', gridTemplateColumns: '32px minmax(0,1fr) 8px', gap: 1,
                        background: notification.readAt ? '#FFFFFF' : '#F7F8FD',
                        '&:hover': { background: '#F1F4FC' },
                        '&:focus-visible': { outline: '2px solid rgba(74,105,217,.35)', outlineOffset: -2 },
                      }}
                    >
                      <Avatar src={notification.actor?.avatarUrl || ''} sx={{ width: 32, height: 32, borderRadius: '8px', bgcolor: '#4A69D9', fontSize: 12 }}>
                        {initials || <NotificationsNoneRoundedIcon sx={{ fontSize: 18 }} />}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        {notification.project?.name && <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1D2433' }}>{notification.project.name}</Typography>}
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.35, color: '#424957' }}>{getText(notification)}</Typography>
                        <Typography sx={{ fontSize: 11, color: '#7F899E', mt: 0.35 }}>
                          {new Date(notification.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: notification.readAt ? 'transparent' : '#D80000', mt: 0.75 }} />
                    </Box>
                    <Divider />
                  </React.Fragment>
                );
              })}
            </Box>
          ))}
          {hasMore && (
            <Box sx={{ p: 1.5, textAlign: 'center' }}>
              <Button onClick={onLoadMore} disabled={loading} sx={{ textTransform: 'none' }}>
                {loading ? <CircularProgress size={18} /> : (locale === 'ru' ? 'Показать ещё' : 'Show more')}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
