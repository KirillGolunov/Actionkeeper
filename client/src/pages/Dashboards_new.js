import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  MenuItem,
  Alert,
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
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import axios from 'axios';
import { startOfWeek, startOfMonth, startOfQuarter, startOfYear, format, addMonths, addQuarters, addYears, endOfMonth, endOfQuarter, endOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import { LeftArrow, RightArrow } from '../components/ArrowIcons';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import Chip from '@mui/material/Chip';
import ProjectAnalyticsDialog from '../components/ProjectAnalyticsDialog';
import ProjectAnalyticsButton from '../components/ProjectAnalyticsButton';
import { getProjectCategoryMeta } from '../utils/projectCategories';

const PROJECT_CATEGORY_ORDER = [
  'external_delivery',
  'internal_project',
  'operations',
  'people_development',
  'time_off',
  'unclassified',
];

const getDashboardCategoryBarColor = (categoryValue) => {
  const palette = {
    external_delivery: '#7FB48F',
    internal_project: '#93A2E8',
    operations: '#E5B16D',
    people_development: '#C59BDF',
    time_off: '#E0A0A0',
    unclassified: '#AAB3BE',
  };
  return palette[categoryValue] || palette.unclassified;
};

function getPeriodLabel(period, date, t) {
  switch (period) {
    case 'week': {
      const monday = new Date(date);
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return `${format(monday, 'dd.MM.yyyy', { locale: ru })} - ${format(sunday, 'dd.MM.yyyy', { locale: ru })}`;
    }
    case 'month':
      return format(date, 'LLLL yyyy', { locale: ru });
    case 'quarter': {
      const q = Math.floor(date.getMonth() / 3) + 1;
      return t('dashboard.quarterLabel', { quarter: q, year: date.getFullYear() });
    }
    case 'year':
      return format(date, 'yyyy');
    case 'all':
      return t('dashboard.periods.all');
    default:
      return '';
  }
}

function DashboardsNew() {
  const { t, locale } = useTranslation();
  const timeRanges = [
    { value: 'week', label: t('dashboard.periods.week') },
    { value: 'month', label: t('dashboard.periods.month') },
    { value: 'quarter', label: t('dashboard.periods.quarter') },
    { value: 'year', label: t('dashboard.periods.year') },
    { value: 'all', label: t('dashboard.periods.all') },
  ];

  const [timeRange, setTimeRange] = useState('month');
  const [projectData, setProjectData] = useState([]);

  const [error, setError] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState([]);
  const [showProjectPercent, setShowProjectPercent] = useState(false);
  const [viewByUser, setViewByUser] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [periodDate, setPeriodDate] = useState(new Date());
  const [myProjects, setMyProjects] = useState(false);
  const [clientType, setClientType] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const { user: currentUser } = useAuth();

  // Add state for detail data for expanded views
  const [projectDetailData, setProjectDetailData] = useState([]);
  const [userDetailData, setUserDetailData] = useState([]);


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

      setError(null);
      const { startDate, endDate } = getDateRange();
      const dateParams = startDate ? `?startDate=${startDate}&endDate=${endDate}` : '';
      const [projectRes, projectDetailRes, userDetailRes] = await Promise.all([
        axios.get(`/api/analytics/time-by-project-total${dateParams}`),
        axios.get(`/api/analytics/time-by-project${dateParams}`),
        axios.get(`/api/analytics/time-by-user${dateParams}`),
      ]);
      setProjectData(projectRes.data);
      setProjectDetailData(projectDetailRes.data);
      setUserDetailData(userDetailRes.data);
    } catch (err) {
      setError(t('dashboard.errors.fetch')); 
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [timeRange, periodDate]);

  const formatHours = (hours) => Math.round(hours * 100) / 100;
  const handleAnalyticsOpen = (project) => {
    if (!project?.id) return;
    setSelectedProject(project);
    setAnalyticsOpen(true);
  };
  const handleAnalyticsClose = () => {
    setAnalyticsOpen(false);
    setSelectedProject(null);
  };

  // Helper: get user's project IDs and client types



  // --- CATEGORY WIDGET: Hours by Project Category ---
  let categoryWidgetData = [];
  if (myProjects && currentUser) {
    const categoryMap = {};
    projectDetailData
      .filter(row =>
        row.user_id === currentUser.id &&
        (!clientType || (row.client_type || row.type) === clientType)
      )
      .forEach((row) => {
        const category = row.project_category || 'unclassified';
        categoryMap[category] = (categoryMap[category] || 0) + row.total_hours;
      });
    categoryWidgetData = PROJECT_CATEGORY_ORDER
      .map((category) => ({
        category,
        label: getProjectCategoryMeta(category).label,
        total_hours: formatHours(categoryMap[category] || 0),
      }))
      .filter((entry) => entry.total_hours > 0);
  } else {
    const categoryMap = {};
    projectData
      .filter((row) => !clientType || (row.client_type || row.type) === clientType)
      .forEach((row) => {
        const category = row.project_category || 'unclassified';
        categoryMap[category] = (categoryMap[category] || 0) + row.total_hours;
      });
    categoryWidgetData = PROJECT_CATEGORY_ORDER
      .map((category) => ({
        category,
        label: getProjectCategoryMeta(category).label,
        total_hours: formatHours(categoryMap[category] || 0),
      }))
      .filter((entry) => entry.total_hours > 0);
  }
  const totalCategoryHours = categoryWidgetData.reduce((sum, entry) => sum + entry.total_hours, 0);
  const widgetCardSx = {
    borderRadius: '24px',
    border: '1px solid rgba(217, 227, 248, 0.95)',
    background: 'rgba(255, 255, 255, 0.92)',
    boxShadow: 'none',
    backdropFilter: 'blur(10px)',
    transition: 'border-color 0.2s ease',
    '&:hover': {
      borderColor: 'rgba(158, 180, 242, 0.95)',
    },
  };
  const widgetTitleSx = {
    fontSize: '1.25rem',
    lineHeight: 1.6,
    fontWeight: 500,
    color: '#202838',
  };
  const pieWidget = (
    <Card sx={widgetCardSx}>
      <CardContent sx={{ height: 404, p: 2.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6, gap: 1.5 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={widgetTitleSx}>
              {locale === 'ru' ? '\u0427\u0430\u0441\u044b \u043f\u043e \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f\u043c' : 'Hours by category'}
            </Typography>
          </Box>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box sx={{ height: 314 }}>
          {categoryWidgetData.length > 0 ? (
            <Box sx={{ display: 'flex', alignItems: 'stretch', height: '100%', gap: 1.5 }}>
              <Box
                sx={{
                  flex: '0 0 52%',
                  height: '100%',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryWidgetData}
                      dataKey="total_hours"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={72}
                      outerRadius={116}
                      paddingAngle={2}
                      stroke="#FFFFFF"
                      strokeWidth={4}
                    >
                      {categoryWidgetData.map((entry) => (
                        <Cell key={entry.category} fill={getDashboardCategoryBarColor(entry.category)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, item) => [
                        t('dashboard.hoursSuffix', { value: formatHours(value) }),
                        item?.payload?.label || (locale === 'ru' ? '\u041a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f' : 'Category'),
                      ]}
                    />
                    <text x="50%" y="46%" textAnchor="middle" dominantBaseline="central" style={{ fill: '#8A97AE', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {locale === 'ru' ? '\u0412\u0441\u0435\u0433\u043e' : 'Total'}
                    </text>
                    <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" style={{ fill: '#243048', fontSize: '26px', fontWeight: 700 }}>
                      {`${formatHours(totalCategoryHours)}\u0447`}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: 0.7, pt: 0.25 }}>
                {categoryWidgetData.map((entry) => (
                  <Box
                    key={entry.category}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '12px minmax(0, 1fr) auto auto',
                      alignItems: 'center',
                      columnGap: 1,
                      px: 1,
                      py: 0.7,
                      borderRadius: '14px',
                      background: 'rgba(248, 251, 255, 0.92)',
                      border: '1px solid #E7EDF9',
                    }}
                  >
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        bgcolor: getDashboardCategoryBarColor(entry.category),
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: '#56637B',
                        lineHeight: 1.25,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={entry.label}
                    >
                      {entry.label}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#2A3447',
                        ml: 1,
                        minWidth: 48,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {`${formatHours(entry.total_hours)}\u0447`}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#8A97AE',
                        minWidth: 32,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {`${Math.round((entry.total_hours / totalCategoryHours) * 100)}%`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="text.secondary">
                {locale === 'ru' ? '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445 \u043f\u043e \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f\u043c' : 'No category data'}
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  // --- CLIENT WIDGET: Hours by Client grouped by external/internal ---
  let clientWidgetGroups = [];
  {
    const sourceRows = myProjects && currentUser
      ? projectDetailData.filter(row =>
          row.user_id === currentUser.id &&
          (!clientType || (row.client_type || row.type) === clientType)
        )
      : projectData.filter(row => !clientType || (row.client_type || row.type) === clientType);

    const groupsMap = {
      external: {
        key: 'external',
        label: locale === 'ru' ? '\u0412\u043d\u0435\u0448\u043d\u0438\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u044b' : 'External clients',
        totalHours: 0,
        items: {},
      },
      internal: {
        key: 'internal',
        label: locale === 'ru' ? '\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0435 \u043a\u043b\u0438\u0435\u043d\u0442\u044b' : 'Internal clients',
        totalHours: 0,
        items: {},
      },
    };

    sourceRows.forEach((row) => {
      const type = (row.client_type || row.type) === 'internal' ? 'internal' : 'external';
      const clientName = (row.client_name && row.client_name.trim()) || t('dashboard.table.unassigned');
      const hours = formatHours(row.total_hours || 0);
      groupsMap[type].totalHours += hours;
      groupsMap[type].items[clientName] = (groupsMap[type].items[clientName] || 0) + hours;
    });

    clientWidgetGroups = ['external', 'internal']
      .map((key) => {
        const group = groupsMap[key];
        const items = Object.entries(group.items)
          .map(([name, hours]) => ({ name, hours: formatHours(hours) }))
          .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name, locale === 'ru' ? 'ru' : 'en', { sensitivity: 'base' }));

        return {
          ...group,
          totalHours: formatHours(group.totalHours),
          items,
        };
      })
      .filter((group) => group.totalHours > 0 && group.items.length > 0);
  }

  const maxClientHours = clientWidgetGroups.reduce((max, group) => {
    const groupMax = group.items.reduce((innerMax, item) => Math.max(innerMax, item.hours), 0);
    return Math.max(max, groupMax);
  }, 0);
  const barWidget = (
    <Card sx={widgetCardSx}>
      <CardContent
        sx={{
          height: 404,
          display: 'flex',
          flexDirection: 'column',
          p: 2.25,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.6, gap: 1.5 }}>
          <Box>
            <Typography variant="h6" gutterBottom sx={widgetTitleSx}>
              {t('dashboard.widgets.hoursByClient')}
            </Typography>
          </Box>
          <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); }}>
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            scrollbarGutter: 'stable',
            scrollbarWidth: 'thin',
            scrollbarColor: '#C8D1E4 #F5F7FB',
            pr: 0.25,
            pb: 0.5,
            '&::-webkit-scrollbar': {
              width: 8,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#F5F7FB',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#C8D1E4',
              borderRadius: 999,
            },
          }}
        >
          {clientWidgetGroups.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 0.5 }}>
              {clientWidgetGroups.map((group) => (
                <Box key={group.key}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 0.7 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#44506A' }}>
                      {group.label}
                    </Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#667389' }}>
                      {`${formatHours(group.totalHours)} ч`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                    {group.items.map((item) => {
                      const percent = maxClientHours > 0 ? (item.hours / maxClientHours) * 100 : 0;
                      return (
                        <Box
                          key={`${group.key}-${item.name}`}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '132px minmax(0, 1fr) 44px',
                            alignItems: 'center',
                            columnGap: 1.25,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: '#56637B',
                              lineHeight: 1.2,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={item.name}
                          >
                            {item.name}
                          </Typography>
                          <Box
                            sx={{
                              height: 10,
                              borderRadius: 999,
                              bgcolor: '#D5DCF6',
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${percent}%`,
                                minWidth: item.hours > 0 ? 10 : 0,
                                height: '100%',
                                borderRadius: 999,
                                bgcolor: '#5673DC',
                              }}
                            />
                          </Box>
                          <Typography
                            sx={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#2A3447',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {`${formatHours(item.hours)}ч`}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height="100%">
              <Typography color="text.secondary">{t('dashboard.widgets.noClientData')}</Typography>
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
      const projectKey = row.project_id || row.project_name;
      if (!acc[projectKey]) {
        acc[projectKey] = {
          project_id: row.project_id,
          project_name: row.project_name,
          project_code: row.project_code,
          project_category: row.project_category,
          client_name: row.client_name,
          total_hours: 0,
        };
      }
      acc[projectKey].total_hours += row.total_hours;
      return acc;
    }, {});
    tableProjectData = Object.values(tableProjectData);
    tableProjectData.sort((a, b) => {
      const categoryIndexA = PROJECT_CATEGORY_ORDER.indexOf(a.project_category || 'unclassified');
      const categoryIndexB = PROJECT_CATEGORY_ORDER.indexOf(b.project_category || 'unclassified');
      if (categoryIndexA !== categoryIndexB) return categoryIndexA - categoryIndexB;
      if (b.total_hours !== a.total_hours) return b.total_hours - a.total_hours;
      return (a.project_name || '').localeCompare(b.project_name || '', locale === 'ru' ? 'ru' : 'en', { sensitivity: 'base' });
    });
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
        .map(d => ({
          project: {
            id: d.project_id,
            name: d.project_name,
            code: d.project_code,
            category: d.project_category,
            clientName: d.client_name,
          },
          hours: d.total_hours,
        }))
        .sort((a, b) => {
          if (b.hours !== a.hours) return b.hours - a.hours;
          const projectA = a.project.code ? `${a.project.code} - ${a.project.name}` : a.project.name;
          const projectB = b.project.code ? `${b.project.code} - ${b.project.name}` : b.project.name;
          return projectA.localeCompare(projectB, locale === 'ru' ? 'ru' : 'en', { sensitivity: 'base' });
        });
      const userTotalHours = userObj.total_hours;
      const percent = totalSystemHours > 0 ? (userTotalHours / totalSystemHours) * 100 : 0;
      userRows.push(
        <TableRow key={user}>
          <TableCell sx={{ fontWeight: 500, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <IconButton size="small" onClick={() => handleExpandClick(user)}>
              {isExpanded ? <RemoveIcon /> : <AddIcon />}
            </IconButton>
            {user || t('dashboard.table.unknownUser')}
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
          <TableCell sx={{ width: 72 }} />
        </TableRow>
      );
      if (isExpanded && userProjects.length > 0) {
        userProjects.forEach(p => {
          const projectPercent = (p.hours / userTotalHours) * 100;
          userRows.push(
            <TableRow key={user + '-' + p.project.id} sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ pl: 6, width: 550, minWidth: 550, maxWidth: 550, py: 0.85 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={getProjectDisplay({ project_name: p.project.name, project_code: p.project.code })}
                  >
                    {getProjectDisplay({ project_name: p.project.name, project_code: p.project.code })}
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.1,
                      fontSize: 11,
                      color: '#8A94A8',
                      lineHeight: 1.25,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={getProjectCategoryMeta(p.project.category).label}
                  >
                    {getProjectCategoryMeta(p.project.category).label}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                {showProjectPercent
                  ? `${Math.round(projectPercent)}%`
                  : `${formatHours(p.hours)}h`}
              </TableCell>
              <TableCell>
                <Box sx={{ width: '100%', height: 5, bgcolor: '#E3DEFF', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${projectPercent}%`,
                      height: '100%',
                      bgcolor: '#8E78FF',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </TableCell>
              <TableCell align="center" sx={{ width: 72 }}>
                <ProjectAnalyticsButton onClick={() => handleAnalyticsOpen(p.project)} />
              </TableCell>
            </TableRow>
          );
        });
      }
      if (isExpanded && userProjects.length === 0) {
        userRows.push(
          <TableRow key={user + '-no-projects'} sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell colSpan={4} align="center">
              <Typography color="text.secondary">{t('dashboard.widgets.noProjectDataForUser')}</Typography>
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
        .map(d => ({ user: (d.user_name || '').trim(), hours: d.total_hours }))
        .sort((a, b) => b.hours - a.hours || a.user.localeCompare(b.user, locale === 'ru' ? 'ru' : 'en', { sensitivity: 'base' }));
      const percent = totalSystemHours > 0 ? (project.total_hours / totalSystemHours) * 100 : 0;
      projectRows.push(
        <TableRow key={project.project_name}>
          <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
              <IconButton size="small" onClick={() => handleExpandClick(project.project_name)} sx={{ mt: 0.1 }}>
                {isExpanded ? <RemoveIcon /> : <AddIcon />}
              </IconButton>
              <Box sx={{ minWidth: 0, pt: 0.1 }}>
                <Typography
                  sx={{
                    fontWeight: 500,
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={getProjectDisplay(project)}
                >
                  {getProjectDisplay(project)}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.1,
                    fontSize: 11,
                    color: '#8A94A8',
                    lineHeight: 1.25,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={getProjectCategoryMeta(project.project_category).label}
                >
                  {getProjectCategoryMeta(project.project_category).label}
                </Typography>
              </Box>
            </Box>
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
                  bgcolor: '#5673DC',
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </Box>
          </TableCell>
          <TableCell align="center" sx={{ width: 72 }}>
            <ProjectAnalyticsButton
              onClick={() =>
                handleAnalyticsOpen({
                  id: project.project_id,
                  name: project.project_name,
                  code: project.project_code,
                  clientName: project.client_name,
                })
              }
            />
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
                <Box sx={{ width: '100%', height: 5, bgcolor: '#E3DEFF', borderRadius: 2, position: 'relative' }}>
                  <Box
                    sx={{
                      width: `${userPercent}%`,
                      height: '100%',
                      bgcolor: '#8E78FF',
                      borderRadius: 2,
                      transition: 'width 0.3s',
                    }}
                  />
                </Box>
              </TableCell>
              <TableCell sx={{ width: 72 }} />
            </TableRow>
          );
        });
      }
      if (isExpanded && usersForProjectFiltered.length === 0) {
        projectRows.push(
          <TableRow key={project.project_name + '-no-users'} sx={{ bgcolor: '#f5f5f5' }}>
            <TableCell colSpan={4} align="center">
              <Typography color="text.secondary">{t('dashboard.widgets.noUserDataForProject')}</Typography>
            </TableCell>
          </TableRow>
        );
      }
    });
  }
  const tableRows = viewByUser ? userRows : projectRows;
  const dashboardSourceRows = myProjects && currentUser
    ? projectDetailData.filter(
        (row) =>
          row.user_id === currentUser.id &&
          (!clientType || (row.client_type || row.type) === clientType)
      )
    : projectDetailData.filter((row) => !clientType || (row.client_type || row.type) === clientType);
  const summaryHours = formatHours(
    dashboardSourceRows.reduce((sum, row) => sum + (row.total_hours || 0), 0)
  );
  const summaryProjects = new Set(
    dashboardSourceRows.map((row) => row.project_id || row.project_name).filter(Boolean)
  ).size;
  const summaryClients = new Set(
    dashboardSourceRows.map((row) => (row.client_name || '').trim()).filter(Boolean)
  ).size;

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

  // Filter button styles (from Projects page)
  const filterTagStyles = {
    all: {
      selected: { background: '#EEF3FF', color: '#5673DC', border: '1.5px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: '1.5px solid transparent' },
      label: t('dashboard.filters.all'),
    },
    my: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1.5px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: '1.5px solid transparent' },
      label: t('dashboard.filters.myProjects'),
    },
    internal: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1.5px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: '1.5px solid transparent' },
      label: t('dashboard.filters.internal'),
    },
    external: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1.5px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: '1.5px solid transparent' },
      label: t('dashboard.filters.external'),
    },
  };

  // Layout: two widgets side by side, one wide below
  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #F6F8FE 0%, #F9FBFF 100%)',
        minHeight: '100%',
        mx: -3,
        mt: -3,
        px: 3,
        pt: 3,
        pb: 4,
      }}
    >
      <Box
        sx={{
          mb: 2,
          p: { xs: 1.5, md: 1.75 },
          borderRadius: '28px',
          border: '1px solid rgba(210, 220, 242, 0.85)',
          background: 'rgba(255, 255, 255, 0.82)',
          boxShadow: '0 10px 30px rgba(91, 117, 231, 0.06)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.9 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35 }}>
            <Typography variant="h4" sx={{ mb: 0.25 }}>
              {t('dashboard.title')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, color: '#7C89A3', fontSize: 14, lineHeight: 1.4 }}>
              <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
                {locale === 'ru' ? `\u0412\u0441\u0435\u0433\u043e \u0447\u0430\u0441\u043e\u0432 - ${summaryHours}` : `Total hours - ${summaryHours}`}
              </Typography>
              <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
                {locale === 'ru' ? `\u041f\u0440\u043e\u0435\u043a\u0442\u043e\u0432 - ${summaryProjects}` : `Projects - ${summaryProjects}`}
              </Typography>
              <Typography component="span" sx={{ fontSize: 'inherit', color: 'inherit' }}>
                {locale === 'ru' ? `\u041a\u043b\u0438\u0435\u043d\u0442\u043e\u0432 - ${summaryClients}` : `Clients - ${summaryClients}`}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: '1fr auto 1fr' }, alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              <Chip
                label={filterTagStyles.all.label}
                clickable
                onClick={() => { setMyProjects(false); setClientType(null); }}
                sx={{
                  fontSize: '13px',
                    height: '40px',
                    borderRadius: '12px',
                    px: 0.75,
                    fontWeight: 500,
                    boxShadow: 'none',
                  ...(myProjects === false && !clientType ? filterTagStyles.all.selected : filterTagStyles.all.default),
                }}
              />
              <Chip
                label={filterTagStyles.my.label}
                clickable
                onClick={() => setMyProjects(v => !v)}
                sx={{
                  fontSize: '13px',
                    height: '40px',
                    borderRadius: '12px',
                    px: 0.75,
                    fontWeight: 500,
                    boxShadow: 'none',
                  ...(myProjects ? filterTagStyles.my.selected : filterTagStyles.my.default),
                }}
              />
              <Chip
                label={filterTagStyles.internal.label}
                clickable
                onClick={() => setClientType(clientType === 'internal' ? null : 'internal')}
                sx={{
                  fontSize: '13px',
                    height: '40px',
                    borderRadius: '12px',
                    px: 0.75,
                    fontWeight: 500,
                    boxShadow: 'none',
                  ...(clientType === 'internal' ? filterTagStyles.internal.selected : filterTagStyles.internal.default),
                }}
              />
              <Chip
                label={filterTagStyles.external.label}
                clickable
                onClick={() => setClientType(clientType === 'external' ? null : 'external')}
                sx={{
                  fontSize: '13px',
                    height: '40px',
                    borderRadius: '12px',
                    px: 0.75,
                    fontWeight: 500,
                    boxShadow: 'none',
                  ...(clientType === 'external' ? filterTagStyles.external.selected : filterTagStyles.external.default),
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: '12px', px: 1, py: 0, background: '#F8FAFF', border: '1px solid #E1E8F9', flexShrink: 0 }}>
                <IconButton onClick={() => {
                  if (timeRange === 'week') setPeriodDate(d => new Date(d.setDate(d.getDate() - 7)));
                  if (timeRange === 'month') setPeriodDate(d => addMonths(d, -1));
                  if (timeRange === 'quarter') setPeriodDate(d => addQuarters(d, -1));
                  if (timeRange === 'year') setPeriodDate(d => addYears(d, -1));
                }}
                  disabled={timeRange === 'all'}
                  sx={{ color: timeRange === 'all' ? '#C5C9D3' : '#5673DC', width: 32, height: 32 }}
                >
                  <LeftArrow color={timeRange === 'all' ? '#C5C9D3' : '#5673DC'} size={32} />
                </IconButton>
                <Typography variant="subtitle1" sx={{ minWidth: { xs: 140, md: 180 }, textAlign: 'center', display: 'inline-block', fontWeight: 600, color: '#2A3447' }}>
                  {getPeriodLabel(timeRange, periodDate, t)}
                </Typography>
                <IconButton onClick={() => {
                  if (timeRange === 'week') setPeriodDate(d => new Date(d.setDate(d.getDate() + 7)));
                  if (timeRange === 'month') setPeriodDate(d => addMonths(d, 1));
                  if (timeRange === 'quarter') setPeriodDate(d => addQuarters(d, 1));
                  if (timeRange === 'year') setPeriodDate(d => addYears(d, 1));
                }}
                  disabled={timeRange === 'all' || isNextPeriodInFuture()}
                  sx={{ color: timeRange === 'all' || isNextPeriodInFuture() ? '#C5C9D3' : '#5673DC', width: 32, height: 32 }}
                >
                  <RightArrow color={timeRange === 'all' || isNextPeriodInFuture() ? '#C5C9D3' : '#5673DC'} size={32} />
                </IconButton>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', xl: 'flex-end' } }}>
              {timeRanges.map(option => (
                <Button
                  key={option.value}
                  variant={timeRange === option.value ? 'outlined' : 'text'}
                  onClick={() => setTimeRange(option.value)}
                  sx={{
                    minWidth: option.value === 'all' ? 112 : 84,
                    height: 40,
                    borderRadius: '12px',
                    border: timeRange === option.value ? '1.5px solid #5673DC' : '1.5px solid #E2E4E9',
                    color: timeRange === option.value ? '#5673DC' : '#222',
                    background: timeRange === option.value ? 'rgba(86,115,220,0.06)' : '#f7f8fa',
                    fontWeight: 500,
                    fontSize: 13,
                    boxShadow: 'none',
                    textTransform: 'none',
                    flexShrink: 0,
                    '&:hover': {
                      background: 'rgba(86,115,220,0.10)',
                      border: '1.5px solid #5673DC',
                      color: '#5673DC',
                    },
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: '16px' }}>{error}</Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', lg: 'row' } }}>
        <Box sx={{ flex: 1 }}>{pieWidget}</Box>
        <Box sx={{ flex: 1 }}>{barWidget}</Box>
      </Box>
      <Box>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.widgets.hoursByProject')}
              </Typography>
              <IconButton onClick={(e) => { setMenuAnchorEl(e.currentTarget); }}>
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
                label={viewByUser ? t('dashboard.options.viewByUser') : t('dashboard.options.viewByProject')}
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
                label={showProjectPercent ? t('dashboard.options.showPercent') : t('dashboard.options.showHours')}
              />
            </Box>
            <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: 550, minWidth: 550, maxWidth: 550, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewByUser ? t('dashboard.table.user') : t('dashboard.table.project')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.table.totalHours')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('dashboard.table.load')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600, width: 72 }}>{locale === 'ru' ? 'Аналитика' : 'Analytics'}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableRows.length > 0 ? tableRows : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        <Typography color="text.secondary">{t('dashboard.widgets.noProjectData')}</Typography>
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
        onClose={() => { setMenuAnchorEl(null); }}
      >
        <MenuItem disabled>{t('dashboard.options.widgetSettingsSoon')}</MenuItem>
      </Menu>
      <ProjectAnalyticsDialog
        open={analyticsOpen}
        project={selectedProject}
        onClose={handleAnalyticsClose}
      />
    </Box>
  );
}

export default DashboardsNew; 


