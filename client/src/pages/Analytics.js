import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import DepartmentUserControl from '../components/DepartmentUserControl';
import TeamDashboard from '../components/TeamDashboard';
import Projects from './Projects';
import { useTranslation } from '../i18n/I18nProvider';
import { useAuth } from '../context/AuthContext';

export default function Analytics() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const {t}=useTranslation();
  const [selectionPeriod,setSelectionPeriod]=useState({startDate:`${new Date().getFullYear()}-01-01`,endDate:`${new Date().getFullYear()}-12-31`});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [teamView, setTeamView] = useState(() => currentUser?.role === 'admin' ? 'completion' : 'analytics');
  const [openedProjectId, setOpenedProjectId] = useState(null);

  useEffect(()=>{if(currentUser?.role)setTeamView(currentUser.role==='admin'?'completion':'analytics');},[currentUser?.role]);
  useEffect(()=>{setSelectedSubject(null);},[currentUser?.id]);
  const initializeSelection=useCallback(options=>{setSelectedSubject(previous=>{if(previous!==null)return previous;const first=currentUser?.role!=='admin'?(options.departments||[]).find(d=>!d.archived_at&&(options.managedDepartmentIds||[]).includes(d.id)):null;return first?`department:${first.id}`:'team';});},[currentUser?.role]);
  const changeTeamView = (nextView) => {
    setTeamView(nextView);

  };

  const openTimesheet = (userId, weekStart) => {
    navigate(`/?mode=mine&userId=${encodeURIComponent(userId)}&week=${encodeURIComponent(weekStart)}`);
  };
  const openProject = (projectId) => {
    setOpenedProjectId(projectId);
  };

  return (
    <Box sx={{ height: '100%', minHeight: 0, p: { xs: 1, sm: 2, xl: 3 }, pt: { xs: 7, sm: 2, xl: 3 }, overflow: 'hidden', bgcolor: '#F6F7F9' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: { xs: 'auto minmax(0,1fr)', sm: '68px minmax(0,1fr)' }, gap: { xs: 1, sm: 1.5 }, overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 0 }, display: 'flex', alignItems: 'center', bgcolor: '#FFFFFF', border: '1px solid #E2E4E9', borderRadius: 3 }}>
          <DepartmentUserControl currentUser={currentUser} purpose="analytics" value={selectedSubject} onChange={setSelectedSubject} onOptionsLoaded={initializeSelection} {...selectionPeriod} />
        </Box>
        <Box sx={{ minHeight: 0, overflow: 'hidden' }}>
          {selectedSubject===null?<Box sx={{height:'100%',display:'grid',placeItems:'center'}}><CircularProgress aria-label={t('departmentHistory.loadingSelection')}/></Box>:<TeamDashboard
            onPeriodChange={next=>setSelectionPeriod(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next)}
            currentUser={currentUser}
            selectedSubject={selectedSubject}
            teamView={teamView}
            onTeamViewChange={changeTeamView}
            onOpenTimesheet={openTimesheet}
            onOpenProject={openProject}
          />}
        </Box>
      </Box>
      {openedProjectId && <Projects modalOnly initialProjectId={openedProjectId} onModalClose={() => setOpenedProjectId(null)} />}
    </Box>
  );
}
