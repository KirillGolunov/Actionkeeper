import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import SegmentedCapsule from '../components/SegmentedCapsule';
import HomeUserControl from '../components/HomeUserControl';
import TeamDashboard from '../components/TeamDashboard';
import TimeEntries from './TimeEntries';
import { useAuth } from '../context/AuthContext';

const HOME_MODES = [
  { value: 'mine', label: 'Моё время' },
  { value: 'team', label: 'Команда' },
];
const LEGACY_TEAM_MODES = new Set(['managed', 'company', 'portfolio']);
const TEAM_OPTION = { id: 'team', name: 'Вся команда', surname: '' };

function normalizeMode(value) {
  if (value === 'team' || LEGACY_TEAM_MODES.has(value)) return 'team';
  return 'mine';
}

export default function Home() {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawMode = searchParams.get('mode') || 'mine';
  const mode = normalizeMode(rawMode);
  const [mineUserId, setMineUserId] = useState(currentUser?.id || '');
  const [teamSubject, setTeamSubject] = useState('team');
  const [mineDirty, setMineDirty] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  useEffect(() => {
    if (rawMode !== mode) setSearchParams({ mode }, { replace: true });
  }, [mode, rawMode, setSearchParams]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (currentUser.role !== 'admin' || !mineUserId) setMineUserId(currentUser.id);
  }, [currentUser, mineUserId]);

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
      setTeamSubject((selected) => selected === 'team' || nextUsers.some((user) => !user.deleted && String(user.id) === String(selected)) ? selected : 'team');
    } catch (error) {
      setUsers([]);
      setUsersError(error.response?.data?.error || 'Не удалось загрузить список пользователей');
      setMineUserId(currentUser.id);
      setTeamSubject('team');
    } finally {
      setUsersLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const teamUsers = useMemo(() => {
    if (!currentUser) return [TEAM_OPTION];
    if (currentUser.role === 'admin') return [TEAM_OPTION, ...users.filter((user) => !user.deleted)];
    return [TEAM_OPTION, currentUser];
  }, [currentUser, users]);

  const changeMode = (nextMode) => {
    if (mode === 'mine' && nextMode !== 'mine' && mineDirty && !window.confirm('Есть несохранённые изменения. Перейти без сохранения?')) return;
    if (nextMode !== 'mine') setMineDirty(false);
    setSearchParams({ mode: nextMode });
  };

  const changeMineUser = (nextUserId) => {
    if (String(nextUserId) === String(mineUserId)) return;
    if (mineDirty && !window.confirm('Есть несохранённые изменения. Сменить сотрудника без сохранения?')) return;
    setMineDirty(false);
    setMineUserId(nextUserId);
  };

  return (
    <Box sx={{ height: '100%', minHeight: 0, p: { xs: 1, sm: 2, xl: 3 }, pt: { xs: 7, sm: 2, xl: 3 }, overflow: 'hidden', bgcolor: '#F6F7F9' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: { xs: 'auto minmax(0,1fr)', sm: '68px minmax(0,1fr)' }, gap: { xs: 1, sm: 1.5 }, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 0 }, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, bgcolor: '#FFFFFF', border: '1px solid #E2E4E9', borderRadius: 3 }}>
          {mode === 'mine' ? (
            <HomeUserControl
              currentUser={currentUser}
              users={users}
              value={mineUserId}
              onChange={changeMineUser}
              loading={usersLoading}
              error={usersError}
            />
          ) : (
            <HomeUserControl
              currentUser={currentUser}
              users={teamUsers}
              value={teamSubject}
              onChange={setTeamSubject}
              loading={usersLoading}
              forceDropdown
            />
          )}
          <SegmentedCapsule value={mode} options={HOME_MODES} onChange={changeMode} ariaLabel="Режим Главной" />
        </Box>
        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
          {mode === 'mine' ? (
            <TimeEntries embedded selectedUserId={mineUserId} onDirtyChange={setMineDirty} />
          ) : (
            <TeamDashboard currentUser={currentUser} selectedSubject={teamSubject} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
