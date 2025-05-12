import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  IconButton,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  Button,
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format, addMonths, addQuarters, addYears, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';
import WeekSelector from '../components/WeekSelector';
import { LeftArrow, RightArrow } from '../components/ArrowIcons';
import { useAuth } from '../context/AuthContext';
import Chip from '@mui/material/Chip';

const COLORS = ['#8785d4','#5673DC', '#00C49F', '#FFBB28', '#FF8042'];

const timeRanges = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

function getPeriodLabel(period, date) {
  switch (period) {
    case 'week': {
      const monday = new Date(date);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `${format(monday, 'dd.MM.yyyy')} - ${format(sunday, 'dd.MM.yyyy')}`;
    }
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'quarter': {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return `Q${q} ${date.getFullYear()}`;
    }
    case 'year':
      return format(date, 'yyyy');
    default:
      return '';
  }
}

function DashboardsNew() {
  const [timeRange, setTimeRange] = useState('month');
  const [projectData, setProjectData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [clientTypeData, setClientTypeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [showProjectPercent, setShowProjectPercent] = useState(false);
  const [viewByUser, setViewByUser] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeWidget, setActiveWidget] = useState(null);
  const [rotateClientLabels, setRotateClientLabels] = useState(false);
  const [periodDate, setPeriodDate] = useState(new Date());
  const [myProjects, setMyProjects] = useState(false);
  const [clientType, setClientType] = useState(null);
  const { user: currentUser } = useAuth();

  // Add state for detail data for expanded views
  const [projectDetailData, setProjectDetailData] = useState([]);
  const [userDetailData, setUserDetailData] = useState([]);
  const [clientTypeDetailData, setClientTypeDetailData] = useState([]);

  const getDateRange = () => {
    let startDate;
    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(periodDate, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(periodDate);
        break;
      case 'quarter':
        startDate = startOfQuarter(periodDate);
        break;
      case 'year':
        startDate = startOfYear(periodDate);
        break;
      default:
        startDate = null;
    }
    let endDate;
    switch (timeRange) {
      case 'week':
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        break;
      case 'month':
        endDate = endOfMonth(periodDate);
        break;
      case 'quarter':
        endDate = endOfQuarter(periodDate);
        break;
      case 'year':
        endDate = endOfYear(periodDate);
        break;
      default:
        endDate = periodDate;
    }
    return {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') : null,
      endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();
      const dateParams = startDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
      const [projectRes, userRes, clientTypeRes, projectDetailRes, userDetailRes, clientTypeDetailRes] = await Promise.all([
        axios.get(`/api/analytics/time-by-project-total${dateParams}`),
        axios.get(`/api/analytics/time-by-user-total${dateParams}`),
        axios.get(`/api/analytics/time-by-client-type-total${dateParams}`),
        axios.get(`/api/analytics/time-by-project${dateParams}`),
        axios.get(`/api/analytics/time-by-user${dateParams}`),
        axios.get(`/api/analytics/time-by-client-type${dateParams}`),
      ]);
      setProjectData(projectRes.data);
      setUserData(userRes.data);
      setClientTypeData(clientTypeRes.data);
      setProjectDetailData(projectDetailRes.data);
      setUserDetailData(userDetailRes.data);
      setClientTypeDetailData(clientTypeDetailRes.data);
    } catch (err) {
      setError('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [timeRange, periodDate]);

  const formatHours = (hours) => Math.round(hours * 100) / 100;

  // Helper: get user's project IDs and client types
  const myProjectIds = new Set(userData.filter(u => u.user_id === currentUser?.id).map(u => u.project_id));
  const myClientTypes = new Set(projectData.filter(p => myProjectIds.has(p.project_id)).map(p => p.client_type || p.type));

  // --- PIE WIDGET: Internal vs External Hours ---
  let pieData = [];
  // Aggregate by client_type
  const pieMap = {};
  clientTypeData.filter(row => {
    let ok = true;
    if (myProjects && currentUser) ok = ok && row.user_id === currentUser.id;
    if (clientType) ok = ok && (row.client_type || row.type) === clientType;
    return ok;
  }).forEach(row => {
    const type = row.client_type || row.type || 'unknown';
    pieMap[type] = (pieMap[type] || 0) + row.total_hours;
  });
  pieData = Object.entries(pieMap).map(([client_type, total_hours]) => ({ client_type, total_hours }));
  const totalClientTypeHours = pieData.reduce((sum, entry) => sum + entry.total_hours, 0);
  const pieWidget = (
    <Card>
      <CardContent sx={{ height: 390 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Internal vs External Hours
          </Typography>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); setActiveWidget('clientType'); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ mb: 1, textAlign: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            Total: {formatHours(totalClientTypeHours)} hours
          </Typography>
        </Box>
        <Box sx={{ height: 300 }}>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="total_hours"
                  nameKey="client_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ client_type, total_hours }) => `${client_type}: ${formatHours(total_hours)}h`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={entry.client_type} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatHours(value) + ' hours'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="text.secondary">No client type data available</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // --- BAR WIDGET: Hours by Client ---
  let barData = [];
  if (myProjects && currentUser) {
    // Aggregate from projectDetailData for current user and clientType
    const mapBar = {};
    projectDetailData
      .filter(row => 
        row.user_id === currentUser.id &&
        (!clientType || (row.client_type || row.type) === clientType)
      )
      .forEach(row => {
        const client = (row.client_name && row.client_name.trim()) || 'Unassigned';
        mapBar[client] = (mapBar[client] || 0) + row.total_hours;
      });
    barData = Object.entries(mapBar).map(([name, hours]) => ({ name, hours: formatHours(hours) }));
  } else {
    // Use projectData for all users
    const barFilterAll = row => {
      let ok = true;
      if (clientType) ok = ok && (row.client_type || row.type) === clientType;
      return ok;
    };
    const mapBarAll = {};
    projectData.filter(barFilterAll).forEach(row => {
      const client = (row.client_name && row.client_name.trim()) || 'Unassigned';
      mapBarAll[client] = (mapBarAll[client] || 0) + row.total_hours;
    });
    barData = Object.entries(mapBarAll).map(([name, hours]) => ({ name, hours: formatHours(hours) }));
  }
  const barWidget = (
    <Card>
      <CardContent sx={{ height: 390 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Hours by Client
          </Typography>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); setActiveWidget('hoursByClient'); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ height: 300 }}>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={rotateClientLabels ? -30 : 0} textAnchor={rotateClientLabels ? 'end' : 'middle'} interval={rotateClientLabels ? 0 : 'preserveEnd'} />
                <YAxis />
                <Tooltip formatter={value => value + ' hours'} />
                <Legend />
                <Bar dataKey="hours" fill="#8884d8" name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="text.secondary">No client data available</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // --- TABLE: Hours by Project/User ---
  let tableProjectData = [];
  let tableUserData = [];
  // Unified filtering for both modes
  let filteredProjectDetail = projectDetailData;
  let filteredUserDetail = userDetailData;
  if (myProjects && currentUser) {
    filteredProjectDetail = filteredProjectDetail.filter(row => row.user_id === currentUser.id);
    filteredUserDetail = filteredUserDetail.filter(row => row.user_id === currentUser.id);
  }
  if (clientType) {
    filteredProjectDetail = filteredProjectDetail.filter(row => (row.client_type || row.type) === clientType);
    filteredUserDetail = filteredUserDetail.filter(row => (row.client_type || row.type) === clientType);
  }
  if (viewByUser) {
    // Aggregate by user_name
    tableUserData = filteredUserDetail.reduce((acc, row) => {
      const user = row.user_name;
      if (!acc[user]) acc[user] = 0;
      acc[user] += row.total_hours;
      return acc;
    }, {});
    tableUserData = Object.entries(tableUserData).map(([user_name, total_hours]) => ({ user_name, total_hours }));
  } else {
    // Aggregate by project_name
    tableProjectData = filteredProjectDetail.reduce((acc, row) => {
      const project = row.project_name;
      if (!acc[project]) acc[project] = 0;
      acc[project] += row.total_hours;
      return acc;
    }, {});
    tableProjectData = Object.entries(tableProjectData).map(([project_name, total_hours]) => ({ project_name, total_hours }));
  }
  const totalSystemHours = viewByUser
    ? tableUserData.reduce((sum, u) => sum + u.total_hours, 0)
    : tableProjectData.reduce((sum, project) => sum + project.total_hours, 0);

  // Table rows (expanded views use detail data)
  let projectRows = [];
  let userRows = [];

  const handleExpandClick = (name) => {
    setExpandedProjects((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  // Add a helper to format project display
  const getProjectDisplay = (project) => {
    if (!project) return '';
    // If project is a string (expanded row), just return it
    if (typeof project === 'string') return project;
    return project.project_code ? `${project.project_code} - ${project.project_name}` : project.project_name;
  };

  if (viewByUser) {
    tableUserData.forEach(userObj => {
      const user = userObj.user_name;
      const isExpanded = expandedProjects.includes(user);
      const userProjects = filteredUserDetail
        .filter(d => d.user_name === user && d.total_hours > 0)
        .map(d => ({ project: d.project_name, hours: d.total_hours }));
      const userTotalHours = userObj.total_hours;
      const percent = totalSystemHours > 0 ? (userTotalHours / totalSystemHours) * 100 : 0;
      userRows.push(
        <TableRow key={user}>
          <TableCell sx={{ fontWeight: 500, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <IconButton size="small" onClick={() => handleExpandClick(user)}>
              {isExpanded ? <RemoveIcon /> : <AddIcon />}
            </IconButton>
            {user || 'Unknown User'}
          </TableCell>
          <TableCell>
            {showProjectPercent
              ? `${Math.round(percent)}%`
              : `${formatHours(userTotalHours)}h`}
          </TableCell>
          <TableCell>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#D5DCF6', borderRadius: 2, position: 'relative' }}>
              <Box
                sx={{
                  width: `${percent}%`,
                  height: '100%',
                  bgcolor: '#5673DC',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </Box>
          </TableCell>
        </TableRow>
      );
      if (isExpanded && userProjects.length > 0) {
        userProjects.forEach(p => {
          const projectPercent = (p.hours / userTotalHours) * 100;
          userRows.push(
            <TableRow key={user + '-' + p.project} sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ pl: 6, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.project}</TableCell>
              <TableCell>
                {showProjectPercent
                  ? `${Math.round(projectPercent)}%`
                  : `${formatHours(p.hours)}h`}
              </TableCell>
              <TableCell>
                <Box sx={{ width: '100%', height: 5, bgcolor: '#D5DCF6', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${projectPercent}%`,
                      height: '100%',
                      bgcolor: '#8e78ff',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </TableCell>
            </TableRow>
          );
        });
      }
      if (isExpanded && userProjects.length === 0) {
        userRows.push(
          <TableRow key={user + '-no-projects'} sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell colSpan={3} align="center">
              <Typography color="text.secondary">No project data for this user</Typography>
            </TableCell>
          </TableRow>
        );
      }
    });
  } else {
    tableProjectData.forEach(project => {
      const isExpanded = expandedProjects.includes(project.project_name);
      const usersForProjectFiltered = filteredProjectDetail
        .filter(d => d.project_name === project.project_name && d.total_hours > 0)
        .map(d => ({ user: (d.user_name || '').trim(), hours: d.total_hours }));
      const percent = totalSystemHours > 0 ? (project.total_hours / totalSystemHours) * 100 : 0;
      projectRows.push(
        <TableRow key={project.project_name}>
          <TableCell sx={{ fontWeight: 500, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <IconButton size="small" onClick={() => handleExpandClick(project.project_name)}>
              {isExpanded ? <RemoveIcon /> : <AddIcon />}
            </IconButton>
            {getProjectDisplay(project)}
          </TableCell>
          <TableCell>
            {showProjectPercent
              ? `${Math.round(percent)}%`
              : `${formatHours(project.total_hours)}h`}
          </TableCell>
          <TableCell>
            <Box sx={{ width: '100%', height: 10, bgcolor: '#D5DCF6', borderRadius: 2, position: 'relative' }}>
              <Box
                sx={{
                  width: `${percent}%`,
                  height: '100%',
                  bgcolor: '#8e78ff',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </Box>
          </TableCell>
        </TableRow>
      );
      if (isExpanded && usersForProjectFiltered.length > 0) {
        usersForProjectFiltered.forEach(u => {
          const userPercent = (u.hours / project.total_hours) * 100;
          projectRows.push(
            <TableRow key={project.project_name + '-' + u.user} sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ pl: 6, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getProjectDisplay(u.user)}</TableCell>
              <TableCell>
                {showProjectPercent
                  ? `${Math.round(userPercent)}%`
                  : `${formatHours(u.hours)}h`}
              </TableCell>
              <TableCell>
                <Box sx={{ width: '100%', height: 5, bgcolor: '#D5DCF6', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${userPercent}%`,
                      height: '100%',
                      bgcolor: '#5673DC',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </TableCell>
            </TableRow>
          );
        });
      }
      if (isExpanded && usersForProjectFiltered.length === 0) {
        projectRows.push(
          <TableRow key={project.project_name + '-no-users'} sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell colSpan={3} align="center">
              <Typography color="text.secondary">No user data for this project</Typography>
            </TableCell>
          </TableRow>
        );
      }
    });
  }
  const tableRows = viewByUser ? userRows : projectRows;

  // Helper: check if next period is in the future
  function isNextPeriodInFuture() {
    const now = new Date();
    let next;
    switch (timeRange) {
      case 'week':
        next = new Date(periodDate);
        next.setDate(next.getDate() + 7);
        return next > now;
      case 'month':
        next = addMonths(periodDate, 1);
        return next > now;
      case 'quarter':
        next = addQuarters(periodDate, 1);
        return next > now;
      case 'year':
        next = addYears(periodDate, 1);
        return next > now;
      default:
        return false;
    }
  }

  // --- DEBUG LOGGING ---
  useEffect(() => {
    console.log('[Dashboard] Raw projectData:', projectData);
    console.log('[Dashboard] Raw userData:', userData);
    console.log('[Dashboard] Raw clientTypeData:', clientTypeData);
    // Pie widget data
    console.log('[Dashboard] Computed pieData:', pieData);
    // Bar widget data
    console.log('[Dashboard] Computed barData:', barData);
    // Table data
    console.log('[Dashboard] Computed tableProjectData:', tableProjectData);
    console.log('[Dashboard] Computed tableUserData:', tableUserData);
  }, [projectData, userData, clientTypeData, pieData, barData, tableProjectData, tableUserData]);

  // Filter button styles (from Projects page)
  const filterTagStyles = {
    all: {
      selected: { background: '#F5F7FA', color: '#5673DC', border: '1.5px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'All',
    },
    my: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'My Projects',
    },
    internal: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'Internal',
    },
    external: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'External',
    },
  };

  // Layout: two widgets side by side, one wide below
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Dashboard</Typography>
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            <Chip
              label={filterTagStyles.all.label}
              clickable
              onClick={() => { setMyProjects(false); setClientType(null); }}
              sx={{
                fontSize: '11px',
                height: '20px',
                borderRadius: '6px',
                px: 0.8,
                fontWeight: 400,
                boxShadow: 'none',
                ...(myProjects === false && !clientType ? filterTagStyles.all.selected : filterTagStyles.all.default),
              }}
            />
            <Chip
              label={filterTagStyles.my.label}
              clickable
              onClick={() => setMyProjects(v => !v)}
              sx={{
                fontSize: '11px',
                height: '20px',
                borderRadius: '6px',
                px: 0.8,
                fontWeight: 400,
                boxShadow: 'none',
                ...(myProjects ? filterTagStyles.my.selected : filterTagStyles.my.default),
              }}
            />
            <Chip
              label={filterTagStyles.internal.label}
              clickable
              onClick={() => setClientType(clientType === 'internal' ? null : 'internal')}
              sx={{
                fontSize: '11px',
                height: '20px',
                borderRadius: '6px',
                px: 0.8,
                fontWeight: 400,
                boxShadow: 'none',
                ...(clientType === 'internal' ? filterTagStyles.internal.selected : filterTagStyles.internal.default),
              }}
            />
            <Chip
              label={filterTagStyles.external.label}
              clickable
              onClick={() => setClientType(clientType === 'external' ? null : 'external')}
              sx={{
                fontSize: '11px',
                height: '20px',
                borderRadius: '6px',
                px: 0.8,
                fontWeight: 400,
                boxShadow: 'none',
                ...(clientType === 'external' ? filterTagStyles.external.selected : filterTagStyles.external.default),
              }}
            />
          </Box>
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {timeRange !== 'all' && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={() => {
                if (timeRange === 'week') setPeriodDate(d => new Date(d.setDate(d.getDate() - 7)));
                if (timeRange === 'month') setPeriodDate(d => addMonths(d, -1));
                if (timeRange === 'quarter') setPeriodDate(d => addQuarters(d, -1));
                if (timeRange === 'year') setPeriodDate(d => addYears(d, -1));
              }}>
                <LeftArrow color="#5673DC" size={32} />
              </IconButton>
              <Typography variant="subtitle1" sx={{ minWidth: 180, textAlign: 'center', display: 'inline-block' }}>
                {getPeriodLabel(timeRange, periodDate)}
              </Typography>
              <IconButton onClick={() => {
                if (timeRange === 'week') setPeriodDate(d => new Date(d.setDate(d.getDate() + 7)));
                if (timeRange === 'month') setPeriodDate(d => addMonths(d, 1));
                if (timeRange === 'quarter') setPeriodDate(d => addQuarters(d, 1));
                if (timeRange === 'year') setPeriodDate(d => addYears(d, 1));
              }}
                disabled={isNextPeriodInFuture()}
                sx={{ color: isNextPeriodInFuture() ? '#C5C9D3' : '#5673DC' }}
              >
                <RightArrow color={isNextPeriodInFuture() ? '#C5C9D3' : '#5673DC'} size={32} />
              </IconButton>
            </Box>
          )}
        </Box>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {timeRanges.map(option => (
            <Button
              key={option.value}
              variant={timeRange === option.value ? 'outlined' : 'text'}
              onClick={() => setTimeRange(option.value)}
              sx={{
                minWidth: 84,
                height: 36,
                borderRadius: 2,
                border: timeRange === option.value ? '1.5px solid #5673DC' : '1.5px solid #E2E4E9',
                color: timeRange === option.value ? '#5673DC' : '#222',
                background: timeRange === option.value ? 'rgba(86,115,220,0.06)' : '#f7f8fa',
                fontWeight: 500,
                fontSize: 13,
                boxShadow: 'none',
                textTransform: 'none',
                '&:hover': {
                  background: 'rgba(86,115,220,0.10)',
                  border: '1.5px solid #5673DC',
                  color: '#5673DC',
                },
              }}
            >
              {option.label.replace('This ', '')}
            </Button>
          ))}
        </Box>
      </Box>
      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>{pieWidget}</Box>
        <Box sx={{ flex: 1 }}>{barWidget}</Box>
      </Box>
      <Box>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Hours by Project
              </Typography>
              <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); setActiveWidget('projectHours'); }}>
                <MoreVertIcon />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={viewByUser}
                    onChange={e => setViewByUser(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        color: '#fff',
                        '&.Mui-checked': {
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#5673DC',
                            opacity: 1,
                          },
                        },
                      },
                      '& .MuiSwitch-thumb': {
                        backgroundColor: '#fff',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: '#E2E4E9',
                        opacity: 1,
                      },
                    }}
                  />
                }
                label={viewByUser ? "View by User" : "View by Project"}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showProjectPercent}
                    onChange={e => setShowProjectPercent(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        color: '#fff',
                        '&.Mui-checked': {
                          '& + .MuiSwitch-track': {
                            backgroundColor: '#5673DC',
                            opacity: 1,
                          },
                        },
                      },
                      '& .MuiSwitch-thumb': {
                        backgroundColor: '#fff',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: '#E2E4E9',
                        opacity: 1,
                      },
                    }}
                  />
                }
                label={showProjectPercent ? 'Show: % of System Total' : 'Show: Hours'}
              />
            </Box>
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewByUser ? 'User' : 'Project'}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Load</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.length > 0 ? tableRows : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography color="text.secondary">No project data available</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => { setMenuAnchorEl(null); setActiveWidget(null); }}
      >
        {activeWidget === 'hoursByClient' && (
          <MenuItem onClick={() => { setRotateClientLabels(v => !v); setMenuAnchorEl(null); }}>
            {rotateClientLabels ? 'Disable' : 'Enable'} X Axis Label Rotation
          </MenuItem>
        )}
        <MenuItem disabled>Widget settings coming soon</MenuItem>
      </Menu>
    </Box>
  );
}

export default DashboardsNew; 