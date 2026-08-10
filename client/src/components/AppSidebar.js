import React, { useState } from 'react';
import {
  Avatar, Box, Drawer, Menu, MenuItem, Tooltip, Typography,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { Home2, NotificationBing } from 'iconsax-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import actionplanLogo from '../assets/actionplan-logo.svg';
import actionplanMark from '../assets/actionplan-mark.svg';
import {
  SIDEBAR_COLLAPSED_INNER_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_INNER_WIDTH,
} from './sidebarDimensions';

function ActionplanMark({ size = 32 }) {
  return (
    <Box
      component="img"
      src={actionplanMark}
      alt=""
      aria-hidden="true"
      sx={{ width: size, height: size, display: 'block', flexShrink: 0, objectFit: 'contain' }}
    />
  );
}

function ActionplanLogo({ compact }) {
  if (compact) return <ActionplanMark size={28} />;
  return <Box component="img" src={actionplanLogo} alt="Actionplan" sx={{ width: 135, height: 32, display: 'block', objectFit: 'contain' }} />;
}

function ProjectIcon() {
  return (
    <Box component="svg" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.5501 9.85L17.4167 9.66667C17.1834 9.38333 16.9084 9.15833 16.5917 8.99167C16.1667 8.75 15.6834 8.625 15.1834 8.625H4.80842C4.30842 8.625 3.83342 8.75 3.40008 8.99167C3.07508 9.16667 2.78342 9.40833 2.54175 9.70833C2.06675 10.3167 1.84175 11.0667 1.91675 11.8167L2.22508 15.7083C2.33342 16.8833 2.47508 18.3333 5.11675 18.3333H14.8834C17.5251 18.3333 17.6584 16.8833 17.7751 15.7L18.0834 11.825C18.1584 11.125 17.9751 10.425 17.5501 9.85ZM11.9918 14.45H8.00008C7.67508 14.45 7.41675 14.1833 7.41675 13.8667C7.41675 13.55 7.67508 13.2833 8.00008 13.2833H11.9918C12.3168 13.2833 12.5751 13.55 12.5751 13.8667C12.5751 14.1917 12.3168 14.45 11.9918 14.45Z" fill="currentColor" />
      <path d="M17.1186 7.01928C17.164 7.40128 16.7469 7.66014 16.3779 7.55123C15.9987 7.43927 15.6022 7.38329 15.1916 7.38329H4.80832C4.39265 7.38329 3.98271 7.44356 3.59536 7.55903C3.23103 7.66765 2.81665 7.41836 2.81665 7.03818V5.54996C2.81665 2.57496 3.72498 1.66663 6.69998 1.66663H7.68332C8.87498 1.66663 9.24998 2.04996 9.73332 2.67496L10.7333 4.00829C10.9417 4.29163 10.95 4.30829 11.3167 4.30829H13.3C15.8457 4.30829 16.8756 4.97475 17.1186 7.01928Z" fill="currentColor" />
    </Box>
  );
}

function SidebarBody({ collapsed, mobile, unreadCount, notificationsOpen, onToggle, onNotifications, onNavigate, onMobileClose }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileAnchor, setProfileAnchor] = useState(null);
  const isAdmin = user?.role === 'admin';
  const compact = collapsed && !mobile;
  const width = mobile ? 320 : (compact ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH);
  const itemWidth = mobile ? 296 : (compact ? SIDEBAR_COLLAPSED_INNER_WIDTH : SIDEBAR_INNER_WIDTH);
  const avatarUrl = user?.avatar_url || '';
  const initials = ((user?.name?.[0] || '') + (user?.surname?.[0] || '')).toUpperCase();

  const go = (path) => {
    onNavigate?.();
    onMobileClose?.();
    navigate(path);
  };
  const handleLogout = async () => {
    setProfileAnchor(null);
    await logout();
    navigate('/signin');
  };
  const items = [
    { key: 'home', label: t('nav.home'), icon: <Home2 variant="Bold" size={20} color="currentColor" />, active: location.pathname === '/', action: () => go('/') },
    { key: 'notifications', label: t('notifications.title'), icon: <NotificationBing variant="Bold" size={20} color="currentColor" />, active: notificationsOpen, action: onNotifications, unread: unreadCount > 0 },
    { key: 'projects', label: t('nav.projects'), icon: <ProjectIcon />, active: location.pathname.startsWith('/projects'), action: () => go('/projects') },
  ];

  return (
    <Box sx={{ width, height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRight: '1px solid #F0F2F4', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      <Box
        sx={{
          width: '100%', height: 60, px: '16px', display: 'flex', alignItems: 'center',
          borderBottom: '1px solid #F0F2F4', flexShrink: 0,
        }}
      >
        <Tooltip title={compact ? t('nav.expandSidebar') : t('nav.collapseSidebar')} placement="right" arrow>
          <Box
            component="button"
            type="button"
            onClick={onToggle}
            aria-label={compact ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
            sx={{ width: compact ? 28 : 135, height: '100%', p: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <ActionplanLogo compact={compact} />
          </Box>
        </Tooltip>
      </Box>

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minHeight: 0 }}>
        <Box component="nav" sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarWidth: 'thin' }}>
          {items.map((item) => {
            const control = (
              <Box
                key={item.key}
                component="button"
                type="button"
                onClick={item.action}
                aria-current={item.active ? 'page' : undefined}
                sx={{
                  width: itemWidth, height: 40, p: 1, gap: 1, mx: 0,
                  border: 0, borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer', font: 'inherit',
                  color: item.active ? '#4A69D9' : '#7F899E', background: 'transparent',
                  '&:hover': { background: '#F7F8FD' },
                  '&:focus-visible': { outline: '2px solid rgba(74,105,217,.25)', outlineOffset: 1 },
                  '& svg': { width: 20, height: 20, display: 'block', flexShrink: 0 },
                }}
              >
                <Box sx={{ width: 20, height: 20, display: 'grid', placeItems: 'center', position: 'relative', flexShrink: 0 }}>
                  {item.icon}
                  {item.unread && compact && <Box sx={{ position: 'absolute', right: -2, top: -2, width: 6, height: 6, borderRadius: '50%', bgcolor: '#D80000' }} />}
                </Box>
                {!compact && <Typography sx={{ flex: 1, textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: '19.5px', fontWeight: 400, color: '#0B0C0F', textTransform: 'none' }}>{item.label}</Typography>}
                {!compact && item.unread && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#D80000', mr: 0.75 }} />}
              </Box>
            );
            return compact ? <Tooltip key={item.key} title={item.label} placement="right" arrow>{control}</Tooltip> : control;
          })}
        </Box>

        <Tooltip title={compact ? `${user?.name || ''} ${user?.surname || ''}` : ''} placement="right" arrow disableHoverListener={!compact}>
          <Box
            component="button"
            type="button"
            onClick={(event) => setProfileAnchor(event.currentTarget)}
            sx={{
              width: itemWidth, height: 28, p: 0, gap: 1,
              mx: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', background: '#FFFFFF', cursor: 'pointer',
              border: 0, boxShadow: 'none', borderRadius: 0, font: 'inherit',
              '&:focus-visible': { outline: '2px solid rgba(74,105,217,.25)' },
            }}
          >
            <Avatar src={avatarUrl} sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: '#4A69D9', fontSize: 11, flexShrink: 0 }}>{!avatarUrl && initials}</Avatar>
            {!compact && (
              <>
                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', textAlign: 'left' }}>
                  <Typography noWrap sx={{ maxWidth: 107, fontSize: 13, lineHeight: '19.5px', fontWeight: 500, color: '#0B0C0F' }}>{user?.name} {user?.surname}</Typography>
                  <KeyboardArrowDownRoundedIcon sx={{ width: 20, height: 20, color: '#0B0C0F', flexShrink: 0 }} />
                </Box>
              </>
            )}
          </Box>
        </Tooltip>
      </Box>

      <Menu
        anchorEl={profileAnchor}
        open={Boolean(profileAnchor)}
        onClose={() => setProfileAnchor(null)}
        disableAutoFocusItem
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        MenuListProps={{ sx: { p: '8px 0' } }}
        PaperProps={{ sx: { ml: '26px', width: 219, minWidth: 219, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 0 0 1px rgba(10,9,11,.12), 0 6px 16px rgba(10,9,11,.08)' } }}
        sx={{ '& .MuiMenuItem-root': { minHeight: 'auto', p: '8px', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: '19.5px', fontWeight: 500, color: '#0B0C0F', borderBottom: '1px solid #F0F2F4', '&:last-of-type': { borderBottom: 0 }, '&.Mui-focusVisible': { background: 'transparent' }, '&:hover': { background: '#F6F8FA' } } }}
      >
        <MenuItem onClick={() => { setProfileAnchor(null); go('/profile'); }}>{t('nav.profile')}</MenuItem>
        {isAdmin && <MenuItem onClick={() => { setProfileAnchor(null); go('/users'); }}>{t('nav.users')}</MenuItem>}
        {isAdmin && <MenuItem onClick={() => { setProfileAnchor(null); go('/clients'); }}>{t('nav.clients')}</MenuItem>}
        {isAdmin && <MenuItem onClick={() => { setProfileAnchor(null); go('/settings/smtp'); }}>{t('nav.settings')}</MenuItem>}
        <MenuItem onClick={handleLogout}>{t('nav.logout')}</MenuItem>
      </Menu>
    </Box>
  );
}

export default function AppSidebar(props) {
  if (props.mobile) {
    return (
      <Drawer open={props.mobileOpen} onClose={props.onMobileClose} PaperProps={{ sx: { width: 320, border: 0 } }}>
        <SidebarBody {...props} collapsed={false} />
      </Drawer>
    );
  }
  return (
    <Box sx={{ position: 'fixed', left: 0, top: 0, zIndex: 1200, width: props.collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH, transition: 'width 200ms ease' }}>
      <SidebarBody {...props} />
    </Box>
  );
}
