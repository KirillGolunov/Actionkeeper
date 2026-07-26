import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Tooltip, Badge, Divider } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import TimerIcon from '@mui/icons-material/Timer';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import InsightsIcon from '@mui/icons-material/Insights';
import { useAuth } from '../context/AuthContext';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AutoLoginBadge from './AutoLoginBadge';
import { useTranslation } from '../i18n/I18nProvider';
import axios from 'axios';

export default function Navbar() {
  const { user, logout, sessionStatus } = useAuth();
  const { t, locale } = useTranslation();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  const [anchorEl, setAnchorEl] = React.useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = React.useState(null);
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;
    try {
      const response = await axios.get('/api/notifications', { params: { limit: 20 } });
      setNotifications(response.data.items || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('[Navbar] Failed to load notifications:', error);
    }
  }, [user]);

  React.useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }
    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, 60000);
    const handleFocus = () => fetchNotifications();
    const handleNotificationsRefresh = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    window.addEventListener('notifications:refresh', handleNotificationsRefresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('notifications:refresh', handleNotificationsRefresh);
    };
  }, [user, fetchNotifications]);

  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
    fetchNotifications();
  };

  const handleNotificationClick = async (notification) => {
    const isBudgetDecision = ['project_budget_change_approved', 'project_budget_change_rejected'].includes(notification.type);
    if (!notification.readAt && !isBudgetDecision) {
      try {
        const response = await axios.patch(`/api/notifications/${notification.id}/read`);
        setNotifications((items) => items.map((item) => item.id === notification.id ? response.data : item));
        setUnreadCount((count) => Math.max(count - 1, 0));
      } catch (error) {
        console.error('[Navbar] Failed to mark notification as read:', error);
      }
    }
    setNotificationsAnchor(null);
    const financialNotification = notification.type?.startsWith('project_payroll_') || notification.type?.startsWith('project_budget_');
    if (financialNotification && notification.project?.id) {
      const params = new URLSearchParams({ projectId: notification.project.id, budget: '1' });
      if (notification.budgetChangeRequestId) {
        params.set('requestId', notification.budgetChangeRequestId);
        params.set(
          'view',
          ['project_budget_change_approved', 'project_budget_change_rejected'].includes(notification.type)
            ? 'result'
            : 'review'
        );
      }
      if (isBudgetDecision) params.set('notificationId', notification.id);
      navigate(`/projects?${params.toString()}`);
    } else {
      navigate('/projects');
    }
  };

  const handleReadAll = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      const readAt = new Date().toISOString();
      setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt || readAt })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[Navbar] Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationText = (notification) => {
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

  const avatarUrl = user?.avatar_url || '';
  const initials = user ? ((user.name?.[0] || '') + (user.surname?.[0] || '')).toUpperCase() : '';
  const progress = sessionStatus?.progress;
  const tooltipTitle = progress
    ? (progress.qualified
        ? t('autologin.qualified')
        : t('autologin.remaining', { remaining: Math.max((progress.requiredDays || 0) - (progress.completedDays || 0), 0) }))
    : '';

  return (
    <AppBar position="static" sx={{ backgroundColor: '#5673DC' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, flexShrink: 0 }}>
          <TimerIcon sx={{ mr: 1.25 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            {t('common.appName')}
          </Typography>
        </Box>
        {user && progress && (
          <Tooltip title={tooltipTitle} arrow>
            <Box sx={{ ml: 2, pl: 1.5, pr: 1.1, py: 0.9, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', display: 'inline-flex', alignItems: 'center', gap: 1.1, width: 'fit-content', maxWidth: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>{t('autologin.badgeTitle')}</Typography>
                <Typography sx={{ fontSize: 12, opacity: 0.95, mt: 0.35 }}>
                  {t('autologin.progress', { completed: progress.completedDays, required: progress.requiredDays })}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.6 }}>
                  {progress.days.map((day) => (
                    <Box key={day.date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 8,
                          borderRadius: 999,
                          backgroundColor: day.complete ? '#9BE7B1' : day.isToday ? '#FFD36E' : 'rgba(255,255,255,0.38)',
                          outline: day.isToday ? '1px solid rgba(255,255,255,0.9)' : 'none',
                          outlineOffset: 1,
                        }}
                      />
                      <Typography sx={{ fontSize: 10, mt: 0.35, opacity: 0.95 }}>{day.label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', alignSelf: 'stretch' }}>
                <AutoLoginBadge qualified={progress.qualified} weekStart={progress.weekStart} userEmail={user?.email} />
              </Box>
            </Box>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', ml: 2 }}>
          <Button color="inherit" component={RouterLink} to="/" startIcon={<InsightsIcon />}>
            {t('nav.dashboard')}
          </Button>
          <Button color="inherit" component={RouterLink} to="/projects" startIcon={<ListAltIcon />}>
            {t('nav.projects')}
          </Button>
          <Button color="inherit" component={RouterLink} to="/clients" startIcon={<PeopleIcon />}>
            {t('nav.clients')}
          </Button>
          <Button color="inherit" component={RouterLink} to="/users" startIcon={<GroupIcon />}>
            {t('nav.users')}
          </Button>
          <Button color="inherit" component={RouterLink} to="/time-entries" startIcon={<TimerIcon />}>
            {t('nav.timeEntries')}
          </Button>
        </Box>
        {user && (
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <Tooltip title={t('notifications.title')}>
              <IconButton onClick={handleNotificationsOpen} color="inherit" size="small" aria-label={t('notifications.title')}>
                <Badge badgeContent={unreadCount} color="error" max={99}>
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={notificationsAnchor}
              open={Boolean(notificationsAnchor)}
              onClose={() => setNotificationsAnchor(null)}
              disableScrollLock
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { width: 380, maxWidth: 'calc(100vw - 24px)', maxHeight: 480, mt: 1, borderRadius: 2 } }}
            >
              <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>{t('notifications.title')}</Typography>
                {unreadCount > 0 && (
                  <Button size="small" startIcon={<DoneAllIcon />} onClick={handleReadAll} sx={{ textTransform: 'none' }}>
                    {t('notifications.readAll')}
                  </Button>
                )}
              </Box>
              <Divider />
              {notifications.length === 0 ? (
                <Typography color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center', fontSize: 14 }}>
                  {t('notifications.empty')}
                </Typography>
              ) : notifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    alignItems: 'flex-start',
                    whiteSpace: 'normal',
                    px: 2,
                    py: 1.25,
                    backgroundColor: notification.readAt ? 'transparent' : 'rgba(86,115,220,0.08)',
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: notification.readAt ? 500 : 700, lineHeight: 1.35 }}>
                      {getNotificationText(notification)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: 11 }}>
                      {new Date(notification.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 2 }}>
              <Avatar src={avatarUrl} sx={{ width: 44, height: 44, bgcolor: '#5673DC', fontWeight: 600, fontSize: 22 }}>
                {!avatarUrl && initials}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              disableScrollLock
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 190,
                  boxShadow: 2,
                  p: 0,
                  mt: 1,
                },
              }}
            >
              <Box sx={{ px: 1.2, pt: 1, pb: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee' }}>
                <Avatar src={avatarUrl} sx={{ width: 32, height: 32, bgcolor: '#5673DC', fontWeight: 600, fontSize: 15 }}>
                  {!avatarUrl && initials}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{user.name} {user.surname}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{user.email}</Typography>
                </Box>
              </Box>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                {t('nav.profile')}
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { handleMenuClose(); navigate('/settings/smtp'); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                  {t('nav.settings')}
                </MenuItem>
              )}
              <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                {t('nav.logout')}
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
