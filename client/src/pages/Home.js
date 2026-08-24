import React, { useCallback, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import { Navigate, useSearchParams } from 'react-router-dom';
import HomeUserControl from '../components/HomeUserControl';
import TimeEntries from './TimeEntries';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';

const LEGACY_TEAM_MODES = new Set(['managed', 'company', 'portfolio']);

const toDateKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const normalizeWeekParam = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : '';

export default function Home() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode') || 'mine';
  const legacyAnalyticsLink = rawMode === 'team' || LEGACY_TEAM_MODES.has(rawMode);
  const requestedUserId = searchParams.get('userId') || '';
  const requestedWeek = normalizeWeekParam(searchParams.get('week'));
  const [mineUserId, setMineUserId] = useState(() => currentUser?.role === 'admin' && requestedUserId ? requestedUserId : currentUser?.id || '');
  const [mineDirty, setMineDirty] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  useEffect(() => {
    if (!currentUser?.id) return;
    if (currentUser.role !== 'admin' || !mineUserId) setMineUserId(currentUser.id);
  }, [currentUser, mineUserId]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (currentUser.role === 'admin' && requestedUserId) setMineUserId(requestedUserId);
    if (currentUser.role !== 'admin' && requestedUserId) {
      setSearchParams({ mode: 'mine', ...(requestedWeek ? { week: requestedWeek } : {}) }, { replace: true });
    }
  }, [currentUser, requestedUserId, requestedWeek, setSearchParams]);

  useEffect(() => {
    if (currentUser?.role !== 'admin' || usersLoading || usersError || !requestedUserId || !users.length) return;
    if (users.some((user) => !user.deleted && String(user.id) === String(requestedUserId))) return;
    setMineUserId(currentUser.id);
    setSearchParams({ mode: 'mine', userId: String(currentUser.id), ...(requestedWeek ? { week: requestedWeek } : {}) }, { replace: true });
  }, [currentUser, requestedUserId, requestedWeek, setSearchParams, users, usersError, usersLoading]);

  const loadUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setUsers([]);
      setUsersError('');
      return;
    }
    setUsersLoading(true);
    setUsersError('');
    try {
      const response = await axios.get('/api/users');
      const nextUsers = Array.isArray(response.data) ? response.data : [];
      setUsers(nextUsers);
      setMineUserId((selected) => nextUsers.some((user) => String(user.id) === String(selected)) ? selected : currentUser.id);
    } catch (error) {
      setUsers([]);
      setUsersError(error.response?.data?.error || t('homeUser.loadError'));
      setMineUserId(currentUser.id);
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser, t]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const changeMineUser = (nextUserId) => {
    if (String(nextUserId) === String(mineUserId)) return;
    if (mineDirty && !window.confirm(t('homeUser.unsavedChangesConfirmation'))) return;
    setMineDirty(false);
    setMineUserId(nextUserId);
    setSearchParams({ mode: 'mine', userId: nextUserId, ...(requestedWeek ? { week: requestedWeek } : {}) });
  };

  const changeMineWeek = (nextWeek) => {
    setSearchParams({ mode: 'mine', ...(mineUserId ? { userId: mineUserId } : {}), week: toDateKey(nextWeek) }, { replace: true });
  };

  if (legacyAnalyticsLink) return <Navigate to="/analytics" replace />;

  return (
    <Box sx={{ height: '100%', minHeight: 0, p: { xs: 1, sm: 2, xl: 3 }, pt: { xs: 7, sm: 2, xl: 3 }, overflow: 'hidden', bgcolor: '#F6F7F9' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: { xs: 'auto minmax(0,1fr)', sm: '68px minmax(0,1fr)' }, gap: { xs: 1, sm: 1.5 }, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 0 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E4E9', borderRadius: 3 }}>
          <HomeUserControl
            currentUser={currentUser}
            users={users}
            value={mineUserId}
            onChange={changeMineUser}
            loading={usersLoading}
            error={usersError}
          />
        </Box>
        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
          <TimeEntries
            embedded
            selectedUserId={mineUserId}
            weekAnchor={requestedWeek ? `${requestedWeek}T12:00:00` : undefined}
            onWeekChange={changeMineWeek}
            onDirtyChange={setMineDirty}
          />
        </Box>
      </Box>
    </Box>
  );
}
