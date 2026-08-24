import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box } from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import HomeUserControl from '../components/HomeUserControl';
import TeamDashboard from '../components/TeamDashboard';
import Projects from './Projects';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';

export default function Analytics() {
  const { user: currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('team');
  const [teamView, setTeamView] = useState(() => currentUser?.role === 'admin' ? 'completion' : 'analytics');
  const [openedProjectId, setOpenedProjectId] = useState(null);

  const loadUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setUsers([]);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/users');
      const nextUsers = Array.isArray(response.data) ? response.data : [];
      setUsers(nextUsers);
      setSelectedSubject((selected) => selected === 'team' || nextUsers.some((user) => !user.deleted && String(user.id) === String(selected)) ? selected : 'team');
    } catch (requestError) {
      setUsers([]);
      setError(requestError.response?.data?.error || t('analytics.usersLoadError'));
      setSelectedSubject('team');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.role, t]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (!currentUser?.role) return;
    setTeamView(currentUser.role === 'admin' ? 'completion' : 'analytics');
  }, [currentUser?.role]);

  const teamUsers = useMemo(() => {
    const teamOption = { id: 'team', name: t('analytics.team'), surname: '' };
    if (!currentUser) return [teamOption];
    if (currentUser.role === 'admin') return [teamOption, ...users.filter((user) => !user.deleted)];
    return [teamOption, currentUser];
  }, [currentUser, t, users]);

  const changeTeamView = (nextView) => {
    setTeamView(nextView);
    if (nextView === 'completion') setSelectedSubject('team');
  };

  const openTimesheet = (userId, weekStart) => {
    navigate(`/?mode=mine&userId=${encodeURIComponent(userId)}&week=${encodeURIComponent(weekStart)}`);
  };
  const openProject = (projectId) => {
    setOpenedProjectId(projectId);
  };

  const completionActive = teamView === 'completion';
  return (
    <Box sx={{ height: '100%', minHeight: 0, p: { xs: 1, sm: 2, xl: 3 }, pt: { xs: 7, sm: 2, xl: 3 }, overflow: 'hidden', bgcolor: '#F6F7F9' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: { xs: 'auto minmax(0,1fr)', sm: '68px minmax(0,1fr)' }, gap: { xs: 1, sm: 1.5 }, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 0 }, display: 'flex', alignItems: 'center', bgcolor: '#FFFFFF', border: '1px solid #E2E4E9', borderRadius: 3 }}>
          <HomeUserControl
            currentUser={currentUser}
            users={completionActive ? [{ id: 'team', name: t('analytics.team'), surname: '' }] : teamUsers}
            value={completionActive ? 'team' : selectedSubject}
            onChange={setSelectedSubject}
            loading={loading}
            error={error}
            forceDropdown
            disabled={completionActive}
          />
        </Box>
        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
          <TeamDashboard
            currentUser={currentUser}
            selectedSubject={selectedSubject}
            teamView={teamView}
            onTeamViewChange={changeTeamView}
            onOpenTimesheet={openTimesheet}
            onOpenProject={openProject}
          />
        </Box>
      </Box>
      {openedProjectId && <Projects modalOnly initialProjectId={openedProjectId} onModalClose={() => setOpenedProjectId(null)} />}
    </Box>
  );
}
