import ProductErrorToast from './ProductErrorToast';
import { useTranslation } from '../i18n/I18nProvider';
import { createRefreshLoader } from '../utils/refreshLoader';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Box, IconButton, useMediaQuery } from '@mui/material';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import NotificationPanel from './NotificationPanel';
import { useAuth } from '../context/AuthContext';
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from './sidebarDimensions';

const SIDEBAR_KEY = 'timeTracker.sidebarCollapsed';

export default function AppShell({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { t } = useTranslation();
  const [refreshError, setRefreshError] = useState(null);
  const navigate = useNavigate();
  const mobile = useMediaQuery('(max-width:767.95px)');
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const notificationRefresh = useRef(null);
  const notificationFlight = useRef(null);

  const fetchNotifications = useCallback(async ({ append = false, before = null, signal } = {}) => {
    if (!userId) return;
    if (notificationFlight.current) return notificationFlight.current;
    setLoading(true);
    const work = (async () => {
    try {
      const response = await axios.get('/api/notifications', { signal, timeout:15000, params: { limit: 20, ...(before ? { before } : {}) } });
      if (signal?.aborted) return;
      setItems((current) => append ? [...current, ...(response.data.items || [])] : (response.data.items || []));
      setUnreadCount(response.data.unreadCount || 0);
      setNextCursor(response.data.nextCursor || null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
    })();
    notificationFlight.current = work;
    try { return await work; } finally { if (notificationFlight.current === work) notificationFlight.current = null; }
  }, [userId]);

  useEffect(() => {
    const loader = createRefreshLoader({
      request: signal => fetchNotifications({signal}),
      onSuccess: () => setRefreshError(null), onError: () => setRefreshError(t('backgroundRefresh.failed')), intervalMs:60000,
    });
    notificationRefresh.current = loader.retry;
    loader.start();
    const refresh = () => loader.retry();
    window.addEventListener('notifications:refresh', refresh);
    return () => { loader.stop(); notificationRefresh.current = null; window.removeEventListener('notifications:refresh', refresh); };
  }, [fetchNotifications, t]);

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      localStorage.setItem(SIDEBAR_KEY, String(!current));
      return !current;
    });
  };
  const openNotifications = () => {
    setNotificationsOpen(true);
    setMobileOpen(false);
    notificationRefresh.current?.();
  };
  const readAll = async () => {
    await axios.post('/api/notifications/read-all');
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt || readAt })));
    setUnreadCount(0);
  };
  const clickNotification = async (notification) => {
    const decision = ['project_budget_change_approved', 'project_budget_change_rejected'].includes(notification.type);
    if (!notification.readAt && !decision) {
      const response = await axios.patch(`/api/notifications/${notification.id}/read`);
      setItems((current) => current.map((item) => item.id === notification.id ? response.data : item));
      setUnreadCount((current) => Math.max(current - 1, 0));
    }
    setNotificationsOpen(false);
    const financial = notification.type?.startsWith('project_payroll_') || notification.type?.startsWith('project_budget_');
    if (financial && notification.project?.id) {
      const params = new URLSearchParams({ projectId: notification.project.id, budget: '1' });
      if (notification.budgetChangeRequestId) {
        params.set('requestId', notification.budgetChangeRequestId);
        params.set('view', decision ? 'result' : 'review');
      }
      if (decision) params.set('notificationId', notification.id);
      navigate(`/projects?${params}`);
    } else navigate('/projects');
  };

  const sidebarProps = {
    collapsed, mobile, mobileOpen, unreadCount, notificationsOpen,
    onToggle: toggleCollapsed,
    onNotifications: openNotifications,
    onMobileClose: () => setMobileOpen(false),
  };

  return (
    <Box sx={{ height: '100dvh', overflow: 'hidden', background: '#F6F8FE', fontFamily: 'Inter, sans-serif' }}>
      <AppSidebar {...sidebarProps} />
      {mobile && (
        <IconButton onClick={() => setMobileOpen(true)} aria-label="Открыть навигацию" sx={{ position: 'fixed', left: 10, top: 10, zIndex: 1100, width: 40, height: 40, bgcolor: '#FFFFFF', boxShadow: 2, '&:hover': { bgcolor: '#FFFFFF' } }}>
          <MenuRoundedIcon />
        </IconButton>
      )}
      <Box sx={{ height: '100dvh', ml: mobile ? 0 : `${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH}px`, minWidth: 0, minHeight: 0, overflow: 'hidden', transition: 'margin-left 200ms ease' }}>
        {children}
      </Box>
      <ProductErrorToast message={refreshError} onClose={() => setRefreshError(null)} />
      <NotificationPanel
        open={notificationsOpen}
        collapsed={collapsed}
        items={items}
        unreadCount={unreadCount}
        loading={loading}
        hasMore={Boolean(nextCursor)}
        onClose={() => setNotificationsOpen(false)}
        onReadAll={readAll}
        onItemClick={clickNotification}
        onLoadMore={() => fetchNotifications({ append: true, before: nextCursor })}
      />
    </Box>
  );
}
