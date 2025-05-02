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
} from '@mui/material';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const timeRanges = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

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

  const getDateRange = () => {
    const now = new Date();
    let startDate;
    switch (timeRange) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = startOfQuarter(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        break;
      default:
        startDate = null;
    }
    return {
      startDate: startDate ? format(startDate, 'yyyy-MM-dd') + 'T00:00:00.000Z' : null,
      endDate: format(now, 'yyyy-MM-dd') + 'T23:59:59.999Z',
    };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const { startDate, endDate } = getDateRange();
      const dateParams = startDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
      const [projectRes, userRes, clientTypeRes] = await Promise.all([
        axios.get(`/api/analytics/time-by-project${dateParams}`),
        axios.get(`/api/analytics/time-by-user${dateParams}`),
        axios.get(`/api/analytics/time-by-client-type${dateParams}`),
      ]);
      setProjectData(projectRes.data);
      setUserData(userRes.data);
      setClientTypeData(clientTypeRes.data);
    } catch (err) {
      setError('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [timeRange]);

  const formatHours = (hours) => Math.round(hours * 100) / 100;

  // Pie Chart: Internal vs External Hours
  const pieWidget = (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Internal vs External Hours
          </Typography>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); setActiveWidget('clientType'); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ height: 300 }}>
          {clientTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientTypeData}
                  dataKey="total_hours"
                  nameKey="client_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ client_type, total_hours }) => `${client_type}: ${formatHours(total_hours)}h`}
                >
                  {clientTypeData.map((entry, index) => (
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

  // Bar Chart: Hours by Client
  const barWidget = (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Hours by Client
          </Typography>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); setActiveWidget('hoursByClient'); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ height: 300 }}>
          {projectData && projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const clientHours = {};
                  projectData.forEach(project => {
                    const client = (project.client_name && project.client_name.trim()) || 'Unassigned';
                    clientHours[client] = (clientHours[client] || 0) + project.total_hours;
                  });
                  console.log('BarChart clientHours:', clientHours);
                  return Object.entries(clientHours).map(([name, hours]) => ({ name, hours: formatHours(hours) }));
                })()}
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

  // Table: Hours by Project/User
  // Prepare users and projects arrays
  const users = Array.from(new Set(userData.map(d => d.user_name)));
  const projects = Array.from(new Set(userData.map(d => d.project_name)));
  const totalSystemHours = projectData.reduce((sum, project) => sum + project.total_hours, 0);

  // Table rows
  let projectRows = [];
  let userRows = [];

  const handleExpandClick = (name) => {
    setExpandedProjects((prev) =>
      prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name]
    );
  };

  if (viewByUser) {
    users.forEach(user => {
      const isExpanded = expandedProjects.includes(user);
      const userProjects = userData
        .filter(d => d.user_name === user && d.total_hours > 0)
        .map(d => ({ project: d.project_name, hours: d.total_hours }));
      const userTotalHours = userProjects.reduce((sum, p) => sum + p.hours, 0);
      const percent = totalSystemHours > 0 ? (userTotalHours / totalSystemHours) * 100 : 0;
      userRows.push(
        <TableRow key={user}>
          <TableCell sx={{ fontWeight: 500 }}>
            <IconButton size="small" onClick={() => handleExpandClick(user)}>
              {isExpanded ? <RemoveIcon /> : <AddIcon />}
            </IconButton>
            {user}
          </TableCell>
          <TableCell>
            {showProjectPercent
              ? `${Math.round(percent)}%`
              : `${formatHours(userTotalHours)}h`}
          </TableCell>
          <TableCell>
            <Box sx={{ width: '100%', height: 16, bgcolor: '#e3eafc', borderRadius: 2, position: 'relative' }}>
              <Box
                sx={{
                  width: `${percent}%`,
                  height: '100%',
                  bgcolor: '#1976d2',
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
              <TableCell sx={{ pl: 6 }}>{p.project}</TableCell>
              <TableCell>
                {showProjectPercent
                  ? `${Math.round(projectPercent)}%`
                  : `${formatHours(p.hours)}h`}
              </TableCell>
              <TableCell>
                <Box sx={{ width: '100%', height: 12, bgcolor: '#e3eafc', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${projectPercent}%`,
                      height: '100%',
                      bgcolor: '#4caf50',
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
    projectData.forEach(project => {
      const isExpanded = expandedProjects.includes(project.project_name);
      const usersForProject = userData
        .filter(d => d.project_name === project.project_name && d.total_hours > 0)
        .map(d => ({ user: d.user_name, hours: d.total_hours }));
      const percent = totalSystemHours > 0 ? (project.total_hours / totalSystemHours) * 100 : 0;
      projectRows.push(
        <TableRow key={project.project_name}>
          <TableCell sx={{ fontWeight: 500 }}>
            <IconButton size="small" onClick={() => handleExpandClick(project.project_name)}>
              {isExpanded ? <RemoveIcon /> : <AddIcon />}
            </IconButton>
            {project.project_name}
          </TableCell>
          <TableCell>
            {showProjectPercent
              ? `${Math.round(percent)}%`
              : `${formatHours(project.total_hours)}h`}
          </TableCell>
          <TableCell>
            <Box sx={{ width: '100%', height: 16, bgcolor: '#e3eafc', borderRadius: 2, position: 'relative' }}>
              <Box
                sx={{
                  width: `${percent}%`,
                  height: '100%',
                  bgcolor: '#1976d2',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </Box>
          </TableCell>
        </TableRow>
      );
      if (isExpanded && usersForProject.length > 0) {
        usersForProject.forEach(u => {
          const userPercent = (u.hours / project.total_hours) * 100;
          projectRows.push(
            <TableRow key={project.project_name + '-' + u.user} sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ pl: 6 }}>{u.user}</TableCell>
              <TableCell>
                {showProjectPercent
                  ? `${Math.round(userPercent)}%`
                  : `${formatHours(u.hours)}h`}
              </TableCell>
              <TableCell>
                <Box sx={{ width: '100%', height: 12, bgcolor: '#e3eafc', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${userPercent}%`,
                      height: '100%',
                      bgcolor: '#4caf50',
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
      if (isExpanded && usersForProject.length === 0) {
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

  // Layout: two widgets side by side, one wide below
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard (New)</Typography>
        <TextField
          select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          sx={{ minWidth: 200 }}
        >
          {timeRanges.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
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
                    color="primary"
                  />
                }
                label={viewByUser ? "View by User" : "View by Project"}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showProjectPercent}
                    onChange={e => setShowProjectPercent(e.target.checked)}
                    color="primary"
                  />
                }
                label={showProjectPercent ? 'Show: % of System Total' : 'Show: Hours'}
              />
            </Box>
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{viewByUser ? 'User' : 'Project'}</TableCell>
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