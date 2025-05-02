import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Collapse,
  Menu,
} from '@mui/material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  HeatMap,
} from 'recharts';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format } from 'date-fns';
import axios from 'axios';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const timeRanges = [
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
];

const ResponsiveGridLayout = WidthProvider(Responsive);

const WIDGET_SIZES = {
  SMALL: { w: 6, h: 6 }, // for charts (6*50=300px)
  WIDE: { w: 12, h: 8 }, // for table (8*50=400px)
};

const WIDGET_POSITIONS = {
  clientType: { x: 0, y: 0 },
  hoursByClient: { x: 6, y: 0 },
  projectHours: { x: 0, y: 6 },
};

const GRID_COLUMNS = 12;
const GRID_ROWS = 12;

const STORAGE_KEY = 'dashboard_widget_settings';

const ROW_HEIGHT = 4;

function Dashboard() {
  console.log('Dashboard component rendered');
  const [timeRange, setTimeRange] = useState('month');
  const [projectData, setProjectData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [clientTypeData, setClientTypeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPercent, setShowPercent] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [showProjectPercent, setShowProjectPercent] = useState(false);
  const [viewByUser, setViewByUser] = useState(false);

  // Load saved settings from localStorage
  const loadSavedSettings = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        return {
          positions: parsed.positions || WIDGET_POSITIONS,
          sizes: parsed.sizes || {
            clientType: WIDGET_SIZES.SMALL,
            hoursByClient: WIDGET_SIZES.SMALL,
            projectHours: WIDGET_SIZES.WIDE,
          }
        };
      }
    } catch (error) {
      console.error('Error loading saved settings:', error);
    }
    return {
      positions: WIDGET_POSITIONS,
      sizes: {
        clientType: WIDGET_SIZES.SMALL,
        hoursByClient: WIDGET_SIZES.SMALL,
        projectHours: WIDGET_SIZES.WIDE,
      }
    };
  };

  const savedSettings = loadSavedSettings();
  const [widgetState, setWidgetState] = useState({
    positions: savedSettings.positions,
    sizes: savedSettings.sizes
  });
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [activeWidget, setActiveWidget] = useState(null);

  // Save settings to localStorage
  const saveSettings = (newState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Update widget state and save
  const updateWidgetState = (newState) => {
    setWidgetState(newState);
    saveSettings(newState);
  };

  const handleMenuClick = (event, widgetId) => {
    setMenuAnchorEl(event.currentTarget);
    setActiveWidget(widgetId);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setActiveWidget(null);
  };

  const handleSizeChange = (size) => {
    if (!activeWidget) return;
    
    const newState = {
      ...widgetState,
      sizes: {
        ...widgetState.sizes,
        [activeWidget]: size,
      }
    };
    updateWidgetState(newState);
    handleMenuClose();
  };

  // Helper function to find the next available row
  const findNextAvailableRow = (widgetState, widgetId, newX) => {
    let currentRow = 0;
    while (true) {
      const widgetsInRow = Object.entries(widgetState.positions).filter(
        ([id, pos]) => id !== widgetId && pos.y === currentRow
      );
      
      if (widgetsInRow.length === 0) {
        return currentRow;
      }

      const leftWidget = widgetsInRow.find(([_, pos]) => pos.x === 0);
      const rightWidget = widgetsInRow.find(([_, pos]) => pos.x === 6);

      if (!leftWidget && newX === 0) {
        return currentRow;
      }
      if (!rightWidget && newX === 6) {
        return currentRow;
      }

      currentRow += 4;
    }
  };

  // Helper to normalize the layout: pack widgets into rows, left to right, top to bottom
  function normalizeLayout(widgetState, widgetOrder = null) {
    // Get all widgets and their sizes
    let widgets = Object.entries(widgetState.sizes).map(([id, size]) => ({
      id,
      size,
      pos: widgetState.positions[id],
    }));
    // If a widgetOrder is provided, use that order; otherwise, sort by y/x
    if (widgetOrder) {
      widgets.sort((a, b) => widgetOrder.indexOf(a.id) - widgetOrder.indexOf(b.id));
    } else {
      widgets.sort((a, b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x));
    }

    let newPositions = {};
    let y = 0;
    while (widgets.length > 0) {
      // Try to fit a wide widget first
      const wideIdx = widgets.findIndex(w => w.size.w === 12);
      if (wideIdx === 0) {
        // If the first widget in order is wide, place it
        const [wide] = widgets.splice(0, 1);
        newPositions[wide.id] = { x: 0, y };
        y += wide.size.h;
        continue;
      } else if (wideIdx > 0) {
        // If a wide widget is next, but not first, place small widgets first
        // (fall through to small widget logic)
      }
      // Otherwise, fit up to two small widgets in the row
      const small1 = widgets.find(w => w.size.w === 6);
      if (small1) {
        newPositions[small1.id] = { x: 0, y };
        widgets.splice(widgets.indexOf(small1), 1);
      }
      const small2 = widgets.find(w => w.size.w === 6);
      if (small2) {
        newPositions[small2.id] = { x: 6, y };
        widgets.splice(widgets.indexOf(small2), 1);
      }
      // Find the max height of the widgets placed in this row
      let rowWidgets = Object.entries(newPositions).filter(([, pos]) => pos.y === y);
      let maxH = Math.max(...rowWidgets.map(([id]) => widgetState.sizes[id].h));
      y += maxH;
    }
    return {
      ...widgetState,
      positions: newPositions,
    };
  }

  // Helper to find the next available row for a small widget, skipping wide widget rows and full rows
  function findNextSmallWidgetRowSafe(startY, direction) {
    let y = startY;
    while (true) {
      y += direction === 'down' ? 6 : -6;
      if (y < 0) return null;
      if (y >= GRID_ROWS * 6) return null;
      const widgetsInRow = Object.entries(widgetState.positions).filter(([, pos]) => pos.y === y);
      const hasWideWidget = widgetsInRow.some(([id]) => widgetState.sizes[id].w === 12);
      if (hasWideWidget) continue; // Skip rows with wide widgets
      if (widgetsInRow.length === 0) return y;
      if (widgetsInRow.length === 1 && widgetState.sizes[widgetsInRow[0][0]].w === 6) return y;
      // If both slots are filled, skip
    }
  }

  const handleMove = (direction) => {
    if (!activeWidget || !widgetState.positions[activeWidget]) return;

    const currentPos = widgetState.positions[activeWidget];
    const newPos = { ...currentPos };
    const widgetSize = widgetState.sizes[activeWidget];
    const isWideWidget = widgetSize.w === 12;

    let targetRow;
    const widgetsBeforeMove = Object.keys(widgetState.positions);
    let widgetOrder = [...widgetsBeforeMove];

    switch (direction) {
      case 'left':
        newPos.x = 0;
        break;
      case 'right':
        newPos.x = 6;
        break;
      case 'up':
        if (!isWideWidget) {
          const nextRow = findNextSmallWidgetRowSafe(currentPos.y, 'up');
          if (nextRow === null) return;
          newPos.y = nextRow;
        } else {
          targetRow = currentPos.y - 6;
          if (targetRow < 0) return;
          // Only move if the row is empty
          const widgetsInTargetRow = Object.entries(widgetState.positions).filter(([, pos]) => pos.y === targetRow);
          if (widgetsInTargetRow.length > 0) return;
          newPos.y = targetRow;
        }
        break;
      case 'down':
        if (!isWideWidget) {
          const nextRow = findNextSmallWidgetRowSafe(currentPos.y, 'down');
          if (nextRow === null) return;
          newPos.y = nextRow;
        } else {
          targetRow = currentPos.y + 6;
          if (targetRow >= GRID_ROWS * 6) return;
          // Only move if the row is empty
          const widgetsInTargetRow = Object.entries(widgetState.positions).filter(([, pos]) => pos.y === targetRow);
          if (widgetsInTargetRow.length > 0) return;
          newPos.y = targetRow;
        }
        break;
      default:
        return;
    }

    // Check for collisions
    const widgetsAtTarget = Object.entries(widgetState.positions).filter(
      ([id, pos]) => id !== activeWidget && pos.y === newPos.y && pos.x === newPos.x
    );

    let newState = { ...widgetState };
    if (widgetsAtTarget.length === 0) {
      // No collision, just move
      newState = {
        ...widgetState,
        positions: {
          ...widgetState.positions,
          [activeWidget]: newPos,
        }
      };
    } else if (widgetsAtTarget.length === 1) {
      // Only allow swap if both are small widgets
      const [otherWidgetId, otherPos] = widgetsAtTarget[0];
      const otherSize = widgetState.sizes[otherWidgetId];
      if (!isWideWidget && otherSize.w === 6) {
        newState = {
          ...widgetState,
          positions: {
            ...widgetState.positions,
            [activeWidget]: newPos,
            [otherWidgetId]: currentPos,
          }
        };
      } else {
        // Don't move if would clash with wide widget or two smalls
        return;
      }
    } else {
      // More than one widget at target (shouldn't happen), don't move
      return;
    }

    newState = normalizeLayout(newState);
    updateWidgetState(newState);
    handleMenuClose();
  };

  const canMove = (widgetId, direction) => {
    if (!widgetId || !widgetState.positions[widgetId]) return false;
    
    const currentPos = widgetState.positions[widgetId];
    const widgetSize = widgetState.sizes[widgetId];
    const isWideWidget = widgetSize.w === 12;

    let targetRow;
    switch (direction) {
      case 'left':
        return currentPos.x !== 0;
      case 'right':
        return currentPos.x !== 6;
      case 'up':
        targetRow = currentPos.y - 6;
        if (targetRow < 0) return false;
        break;
      case 'down':
        targetRow = currentPos.y + 6;
        if (targetRow >= GRID_ROWS * 6) return false;
        break;
      default:
        return false;
    }
    if (direction === 'up' || direction === 'down') {
      // Check if move is possible (always true, as we swap or move)
      return true;
    }
    return false;
  };

  const getLayouts = () => {
    const layout = {
      lg: [
        {
          i: 'clientType',
          x: widgetState.positions.clientType.x,
          y: widgetState.positions.clientType.y,
          w: widgetState.sizes.clientType.w,
          h: widgetState.sizes.clientType.h,
          static: false
        },
        {
          i: 'hoursByClient',
          x: widgetState.positions.hoursByClient.x,
          y: widgetState.positions.hoursByClient.y,
          w: widgetState.sizes.hoursByClient.w,
          h: widgetState.sizes.hoursByClient.h,
          static: false
        },
        {
          i: 'projectHours',
          x: widgetState.positions.projectHours.x,
          y: widgetState.positions.projectHours.y,
          w: widgetState.sizes.projectHours.w,
          h: widgetState.sizes.projectHours.h,
          static: false
        },
      ],
    };
    console.log('Grid layout:', JSON.stringify(layout, null, 2));
    return layout;
  };

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

      console.log('Fetching analytics data with params:', { startDate, endDate });

      const [projectRes, userRes, clientTypeRes] = await Promise.all([
        axios.get(`/api/analytics/time-by-project${dateParams}`),
        axios.get(`/api/analytics/time-by-user${dateParams}`),
        axios.get(`/api/analytics/time-by-client-type${dateParams}`),
      ]);

      console.log('Project data:', projectRes.data);
      console.log('User data:', userRes.data);
      console.log('Client type data:', clientTypeRes.data);

      setProjectData(projectRes.data);
      setUserData(userRes.data);
      setClientTypeData(clientTypeRes.data);

      // Log a sample of projectData after it is set
      if (projectRes.data && projectRes.data.length > 0) {
        console.log('Sample projectData object:', projectRes.data[0]);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to fetch analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const formatHours = (hours) => {
    return Math.round(hours * 100) / 100;
  };

  // Prepare users and projects arrays first so they are available for all calculations
  const users = Array.from(new Set(userData.map(d => d.user_name)));
  const projects = Array.from(new Set(userData.map(d => d.project_name)));

  // Helper: count weekdays between two dates (inclusive)
  function countWeekdays(start, end) {
    let count = 0;
    let current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  // Calculate period start/end
  const now = new Date();
  let periodStart, periodEnd;
  switch (timeRange) {
    case 'week':
      periodStart = startOfWeek(now);
      periodEnd = now;
      break;
    case 'month':
      periodStart = startOfMonth(now);
      periodEnd = now;
      break;
    case 'quarter':
      periodStart = startOfQuarter(now);
      periodEnd = now;
      break;
    case 'year':
      periodStart = startOfYear(now);
      periodEnd = now;
      break;
    case 'all':
    default:
      // Use earliest and latest date in userData
      const allDates = userData.map(d => new Date(d.start_time)).filter(Boolean);
      periodStart = allDates.length ? new Date(Math.min(...allDates)) : now;
      periodEnd = allDates.length ? new Date(Math.max(...allDates)) : now;
      break;
  }
  const weekdays = countWeekdays(periodStart, periodEnd);
  const userCapacity = users.map(() => weekdays * 8);
  // Calculate total hours logged per user in the period
  const userLogged = users.map(user =>
    userData.filter(d => d.user_name === user).reduce((sum, d) => sum + d.total_hours, 0)
  );
  const userAvailable = userCapacity.map((cap, i) => Math.max(0, cap - userLogged[i]));

  // Calculate total system hours across all projects
  const totalSystemHours = projectData.reduce((sum, project) => sum + project.total_hours, 0);

  // Build a matrix: rows = projects, cols = users
  const heatMapData = [
    userAvailable, // Capacity row
    userLogged,   // Total load row
    ...projects.map(project =>
      users.map(user => {
        const found = userData.find(d => d.user_name === user && d.project_name === project);
        return found ? found.total_hours : 0;
      })
    )
  ];
  const allProjectsWithCapacity = ['Capacity', 'Total load', ...projects];

  // Set column width for heatmap (wider for wrapped names)
  const colWidth = 100;
  const cellWidth = 95;
  const cellHeight = 35;
  const xOffset = 100;
  const yOffset = 60;
  const heatmapRows = allProjectsWithCapacity.length;
  const heatmapHeight = heatmapRows * cellHeight + yOffset + 40; // 40 for header padding

  const handleExpandClick = (projectName) => {
    setExpandedProjects((prev) =>
      prev.includes(projectName)
        ? prev.filter((name) => name !== projectName)
        : [...prev, projectName]
    );
  };

  // Precompute table rows to avoid returning arrays or IIFEs in JSX
  let projectRows = [];
  let userRows = [];

  if (viewByUser) {
    const usersList = Array.from(new Set(userData.map(d => d.user_name)));
    usersList.forEach(user => {
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

  // Always flatten the rows to avoid nested arrays
  userRows = userRows.flat(Infinity);
  projectRows = projectRows.flat(Infinity);

  // Debug: log the full structure of the rows before rendering
  try {
    console.log('userRows (full):', JSON.stringify(userRows));
  } catch (e) {
    console.log('userRows (full):', userRows);
  }
  try {
    console.log('projectRows (full):', JSON.stringify(projectRows));
  } catch (e) {
    console.log('projectRows (full):', projectRows);
  }

  let tableRows;
  if (viewByUser) {
    tableRows = <>{userRows}</>;
  } else if (projectRows.length > 0) {
    tableRows = <>{projectRows}</>;
  } else {
    tableRows = (
      <TableRow>
        <TableCell colSpan={3} align="center">
          <Typography color="text.secondary">No project data available</Typography>
        </TableCell>
      </TableRow>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ width: '100%' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={getLayouts()}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={50}
          margin={[16, 16]}
          containerPadding={[16, 16]}
          isDraggable={false}
          isResizable={false}
          style={{ width: '100%' }}
        >
          <div key="projectHours" style={{ background: '#f0f4ff', border: '2px dashed #1976d2', boxSizing: 'border-box' }}>
            <Card style={{ height: '100%' }}>
              <CardContent style={{ height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Hours by Project
                  </Typography>
                  <IconButton onClick={(e) => handleMenuClick(e, 'projectHours')}>
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
                <TableContainer component={Paper} sx={{ boxShadow: 'none', height: '100%' }}>
                  <Table size="small" style={{ height: '100%' }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Project</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Total Hours</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Load</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {tableRows}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </div>
          <div key="clientType" style={{ background: '#f0f4ff', border: '2px dashed #1976d2', boxSizing: 'border-box' }}>
            <Card style={{ height: '100%' }}>
              <CardContent style={{ height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Internal vs External Hours
                  </Typography>
                  <IconButton onClick={(e) => handleMenuClick(e, 'clientType')}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Box sx={{ height: '100%' }}>
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
                          label={({ client_type, total_hours }) => 
                            `${client_type}: ${formatHours(total_hours)}h`
                          }
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
          </div>
          <div key="hoursByClient" style={{ background: '#f0f4ff', border: '2px dashed #1976d2', boxSizing: 'border-box' }}>
            <Card style={{ height: '100%' }}>
              <CardContent style={{ height: '100%' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    Hours by Client
                  </Typography>
                  <IconButton onClick={(e) => handleMenuClick(e, 'hoursByClient')}>
                    <MoreVertIcon />
                  </IconButton>
                </Box>
                <Box sx={{ height: '100%' }}>
                  {projectData && projectData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={(() => {
                          // Aggregate hours by client_name
                          const clientHours = {};
                          projectData.forEach(project => {
                            const client = project.client_name || 'Unassigned';
                            clientHours[client] = (clientHours[client] || 0) + project.total_hours;
                          });
                          // Convert to array for recharts
                          return Object.entries(clientHours).map(([name, hours]) => ({
                            name,
                            hours: Math.round(hours * 100) / 100
                          }));
                        })()}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
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
          </div>
        </ResponsiveGridLayout>
      </Box>
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleSizeChange(WIDGET_SIZES.SMALL)}>
          Small Width
        </MenuItem>
        <MenuItem onClick={() => handleSizeChange(WIDGET_SIZES.WIDE)}>
          Wide Width
        </MenuItem>
        <MenuItem 
          onClick={() => handleMove('left')}
          disabled={!canMove(activeWidget, 'left')}
        >
          Move Left
        </MenuItem>
        <MenuItem 
          onClick={() => handleMove('right')}
          disabled={!canMove(activeWidget, 'right')}
        >
          Move Right
        </MenuItem>
        <MenuItem 
          onClick={() => handleMove('up')}
          disabled={!canMove(activeWidget, 'up')}
        >
          Move Up
        </MenuItem>
        <MenuItem 
          onClick={() => handleMove('down')}
          disabled={!canMove(activeWidget, 'down')}
        >
          Move Down
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Dashboard; 