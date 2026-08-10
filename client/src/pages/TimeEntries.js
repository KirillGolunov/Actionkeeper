import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  MenuItem,
  ListSubheader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Menu,
  ListItemIcon
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { addDays, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import axios from 'axios';
import { Add, Close, Delete, Edit as EditIcon, Search as SearchIcon, MoreVert, UndoRounded } from '@mui/icons-material';
import SingleProjectWeekEditor from '../components/SingleProjectWeekEditor';
import DayHourBar from '../components/DayHourBar';
import WeekSelector from '../components/WeekSelector';
import ConfirmationDialog from '../components/ConfirmationDialog';
import WeekCarousel from '../components/WeekCarousel';
import PageLayout, { PageToolbar } from '../components/PageLayout';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import {
  PROJECT_CATEGORY_ORDER,
  PROJECT_CATEGORY_TRANSITION,
  getProjectCategoryMeta,
} from '../utils/projectCategories';
import MonthHeatmapCalendar from '../components/MonthHeatmapCalendar';
import MineTimeAnalytics from '../components/MineTimeAnalytics';
import EmbeddedWeekTableHeading from '../components/EmbeddedWeekTableHeading';
import HourInput from '../components/HourInput';
import useMineTimeAnalytics from '../hooks/useMineTimeAnalytics';
import { buildPayrollSaveNotice, buildWeeklyValidationIssues } from '../utils/timeEntryNotices';

const WEEKLY_REQUIRED_HOURS = 40;

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function getWeeklyProjectsSignature(rows) {
  return JSON.stringify((rows || [])
    .filter((row) => row.project_id || dayKeys.some((key) => Number(row.hours?.[key]?.value || 0) > 0))
    .map((row) => ({
      projectId: row.project_id || '',
      hours: dayKeys.map((key) => Number(row.hours?.[key]?.value || 0)),
    })));
}

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

const LOCAL_STORAGE_KEY = userId => `weeklyEntries_${userId}`;

// Add a helper to generate a unique id
const uniqueId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Update initial entry structure to include 'id'
const initialEntry = (user_id = '') => ({
  id: uniqueId(),
  project_id: '',
  user_id,
  hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
  submitted: false,
});

const cloneWeeklyEntry = (entry) => ({
  ...entry,
  hours: Object.fromEntries(
    Object.entries(entry.hours || {}).map(([dayKey, dayValue]) => [dayKey, { ...dayValue }])
  ),
});

// Return the selected Monday-Sunday range for API queries.
function getWeekRange(date) {
  // Returns [monday, sunday] as ISO strings
  const d = new Date(date);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [monday.toISOString(), sunday.toISOString()];
}

function getHistoryRange(month, selectedWeek) {
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const selectedMonday = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });
  const trendStart = addDays(selectedMonday, -21);
  const selectedSunday = addDays(selectedMonday, 6);
  const start = monthStart < trendStart ? monthStart : trendStart;
  const end = monthEnd > selectedSunday ? monthEnd : selectedSunday;
  return { start_date: format(start, 'yyyy-MM-dd'), end_date: format(end, 'yyyy-MM-dd') };
}

// Helper to get a unique key for project order in localStorage
function getOrderStorageKey(userId, weekStart) {
  return `weeklyProjectOrder_${userId}_${new Date(weekStart).toISOString().slice(0,10)}`;
}

function setSavedProjectOrder(userId, weekStart, rows) {
  if (!userId) return;
  const orderKey = getOrderStorageKey(userId, weekStart);
  const order = rows.map((row) => row.project_id).filter(Boolean);
  localStorage.setItem(orderKey, JSON.stringify(order));
}

// Helper to format project display
const getProjectDisplay = (project) => {
  if (!project) return '';
  return project.code ? `${project.code} - ${project.name}` : project.name;
};

const getProjectWithCategoryDisplay = (project) => {
  if (!project) return '';
  const category = getProjectCategoryMeta(project.category);
  return `${category.label} / ${getProjectDisplay(project)}`;
};

const getProjectSecondaryText = (project) => {
  if (!project) return '';
  const fallback = getProjectCategoryMeta(project.category).label;
  const description = (project.description || '').trim();
  if (!description) return fallback;
  return description.length > 60 ? `${description.slice(0, 57)}...` : description;
};

const getProjectStateText = (project, t) => {
  if (!project) return '';
  return project.active === 0 ? `${t('projects.closedStatus')} • ${getProjectCategoryMeta(project.category).label}` : getProjectSecondaryText(project);
};

const normalizeSearchText = (value) => (value || '').toString().trim().toLowerCase();

const matchesProjectSearch = (project, searchValue) => {
  const query = normalizeSearchText(searchValue);
  if (!query) return true;
  const categoryLabel = getProjectCategoryMeta(project.category).label;
  const haystack = [
    project.name,
    project.code,
    getProjectDisplay(project),
    categoryLabel,
    project.description,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

function EmbeddedTimeEntriesLayout({ children, editorNotice, footer, calendar, analytics }) {
  return (
    <Box role="tabpanel" id="home-mine-panel" aria-labelledby="home-mine-tab" sx={{ height: '100%', minHeight: 0, containerType: 'inline-size', containerName: 'mine-layout' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: '232px minmax(0, 1fr)', gap: 1.5, '@media (max-width: 767px)': { gridTemplateRows: '480px minmax(0, 1fr)' } }}>
      <Box
        component="section"
        aria-label="Аналитика времени"
        sx={{
          position: 'relative',
          minWidth: 0,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 3fr) minmax(360px, 5fr) minmax(280px, 3fr)',
          gap: 1.5,
          overflow: 'hidden',
          '@container mine-layout (min-width: 1164px)': {
            gridTemplateColumns: 'minmax(280px, 3fr) minmax(420px, 5fr) minmax(320px, 4fr)',
          },
          '@container mine-layout (min-width: 768px) and (max-width: 959px)': {
            gridTemplateColumns: 'minmax(260px, 280px) minmax(0, 1fr)',
            '& .mine-time-distribution': { display: 'none' },
          },
          '@container mine-layout (max-width: 767px)': {
            gridTemplateColumns: '100%',
            gridTemplateRows: '220px 248px',
            '& .mine-time-distribution': { display: 'flex' },
          },
        }}
      >
        {calendar}
        {analytics}
      </Box>
      <Box sx={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFFFFF', boxShadow: 'none', overflow: 'hidden' }}>
        {editorNotice}
        <Box sx={{ minHeight: 0, flex: 1, overflow: 'hidden' }}>{children}</Box>
        {footer}
      </Box>
      </Box>
    </Box>
  );
}

function TimeEntries({ embedded = false, onDataChanged, weekAnchor, onWeekChange, selectedUserId, onDirtyChange }) {
  const navigate = useNavigate();
  const { t, locale } = useTranslation();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const daysOfWeek = dayKeys.map((key) => ({ key, label: t(`timeEntries.weekdays.${key}`) }));
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [saveNotice, setSaveNotice] = useState(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [weekStart, setWeekStart] = useState(() => getMonday(weekAnchor ? new Date(weekAnchor) : new Date()));
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [savedWeeklySignature, setSavedWeeklySignature] = useState('[]');
  const [savedWeeklyProjects, setSavedWeeklyProjects] = useState([]);
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklyLoadError, setWeeklyLoadError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState('idle');
  const [recentlySavedProjectIds, setRecentlySavedProjectIds] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editWeekEntry, setEditWeekEntry] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [weeklyProjects, setWeeklyProjects] = useState([]);
  const [projectSearchByEntry, setProjectSearchByEntry] = useState({});
  const [projectMenuWidth, setProjectMenuWidth] = useState(null);
  const [allWeeks, setAllWeeks] = useState([]); // [{start, end, loggedHours, isCurrent, isSelected, isComplete}]
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [carouselRef, setCarouselRef] = useState(null);
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [rowMenuIndex, setRowMenuIndex] = useState(null);
  const [projectEditingRowId, setProjectEditingRowId] = useState(null);
  const [rowToDeleteIndex, setRowToDeleteIndex] = useState(null);
  const [analyticsRange, setAnalyticsRange] = useState('8w');
  const [analyticsRevision, setAnalyticsRevision] = useState(0);
  const historyRequestRef = useRef(0);
  const weeklyRequestRef = useRef(0);
  const weeklyTableRef = useRef(null);
  const rowRefs = useRef(new Map());
  const addEntryButtonRef = useRef(null);
  const { user: currentUser, refreshSessionStatus } = useAuth();
  const mineAnalytics = useMineTimeAnalytics({
    selectedWeek: weekStart,
    range: analyticsRange,
    currentUser,
    selectedUserId: selectedUser,
    revision: analyticsRevision,
  });

  useEffect(() => {
    if (!weekAnchor) return;
    const next = getMonday(new Date(weekAnchor));
    if (next.toDateString() !== getMonday(weekStart).toDateString()) setWeekStart(next);
  }, [weekAnchor, weekStart]);

  useEffect(() => {
    const weekFocusDate = addDays(weekStart, 3);
    setCalendarMonth((currentMonth) => isSameMonth(weekFocusDate, currentMonth)
      ? currentMonth
      : startOfMonth(weekFocusDate));
  }, [weekStart]);

  useEffect(() => {
    if (selectedUserId && selectedUserId !== selectedUser) setSelectedUser(selectedUserId);
  }, [selectedUser, selectedUserId]);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setSelectedUser(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedUser && weekStart) {
      refreshWeeklyProjects();
    }
  // refreshWeeklyProjects is intentionally excluded because the function is recreated on render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, weekStart]);

  useEffect(() => {
    if (!weeklyLoading && weeklyProjects.length === 0) {
      setWeeklyProjects([initialEntry(selectedUser)]);
    }
    // eslint-disable-next-line
  }, [weeklyLoading, weeklyProjects, selectedUser]);

  useEffect(() => {
    if (!selectedUser) return;
    // Build weeks array: for each week, sum all timeEntries for selected user and week range
    const weeks = [];
    const today = new Date();
    const currentMonday = getMonday(today);
    for (let i = -weeksToShow + 1; i <= 0; i++) {
      const monday = new Date(currentMonday);
      monday.setDate(monday.getDate() + i * 7);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      function toYMD(date) {
        return date.toISOString().slice(0, 10);
      }
      const mondayYMD = toYMD(monday);
      const sundayYMD = toYMD(sunday);
      // Filter all timeEntries for this user and week
      const weekEntries = timeEntries.filter(e =>
        e.user_id === selectedUser &&
        (typeof e.date === 'string' ? e.date.slice(0, 10) : toYMD(new Date(e.date))) >= mondayYMD &&
        (typeof e.date === 'string' ? e.date.slice(0, 10) : toYMD(new Date(e.date))) <= sundayYMD
      );
      // Sum all hours for this week
      const logged = weekEntries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
      weeks.push({
        start: monday.toISOString(),
        end: sunday.toISOString(),
        loggedHours: logged,
        isCurrent: getMonday(today).toDateString() === monday.toDateString(),
        isSelected: getMonday(weekStart).toDateString() === monday.toDateString(),
      });
    }
    // Only include weeks up to and including the current week
    const filteredWeeks = weeks.filter(w => new Date(w.start) <= currentMonday);
    setAllWeeks(filteredWeeks);
  }, [selectedUser, weekStart, timeEntries, weeksToShow]);

  const fetchTimeEntries = useCallback(async () => {
    if (embedded && !selectedUser) return;
    const requestId = ++historyRequestRef.current;
    if (embedded) setHistoryLoading(true);
    setHistoryError('');
    try {
      const params = {};
      if (embedded) {
        Object.assign(params, getHistoryRange(calendarMonth, weekStart));
        if (currentUser?.role === 'admin') params.user_id = selectedUser;
      }
      const response = await axios.get('/api/time-entries', { params });
      if (requestId !== historyRequestRef.current) return;
      console.log('Fetched time entries:', response.data);
      setTimeEntries(response.data);
    } catch (error) {
      if (requestId !== historyRequestRef.current) return;
      console.error('Error fetching time entries:', error);
      if (embedded) setHistoryError(t('timeEntries.errors.fetchEntries'));
      else setSaveNotice({ severity: 'error', message: t('timeEntries.errors.fetchEntries') });
    } finally {
      if (embedded && requestId === historyRequestRef.current) setHistoryLoading(false);
    }
  }, [calendarMonth, currentUser?.role, embedded, selectedUser, t, weekStart]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get('/api/projects');
      console.log('Fetched projects:', response.data);
      const sortedProjects = [...response.data].sort((a, b) => {
        const categoryIndexA = PROJECT_CATEGORY_ORDER.indexOf(a.category || PROJECT_CATEGORY_TRANSITION.value);
        const categoryIndexB = PROJECT_CATEGORY_ORDER.indexOf(b.category || PROJECT_CATEGORY_TRANSITION.value);
        if (categoryIndexA !== categoryIndexB) return categoryIndexA - categoryIndexB;
        return getProjectDisplay(a).localeCompare(getProjectDisplay(b), undefined, { sensitivity: 'base' });
      });
      setProjects(sortedProjects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setSaveNotice({ severity: 'error', message: t('timeEntries.errors.fetchProjects') });
    }
  }, [t]);

  useEffect(() => {
    fetchTimeEntries();
  }, [fetchTimeEntries]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const dayTotals = daysOfWeek.map(day =>
    weeklyProjects.reduce((sum, entry) => sum + (parseFloat(entry.hours[day.key]?.value) || 0), 0)
  );
  const projectTotals = weeklyProjects.map(entry =>
    daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]?.value) || 0), 0)
  );
  const requiredHoursTotal = WEEKLY_REQUIRED_HOURS;

  const refreshWeeklyProjects = async () => {
    if (!selectedUser) return false;
    const requestId = ++weeklyRequestRef.current;
    setWeeklyLoading(true);
    setWeeklyLoadError('');
    try {
      console.log('refreshWeeklyProjects: weekStart', weekStart, 'selectedUser', selectedUser);
      const [startDate, endDate] = getWeekRange(weekStart);
      const res = await axios.get('/api/time-entries', {
        params: {
          user_id: selectedUser,
          start_date: startDate,
          end_date: endDate,
        }
      });
      if (requestId !== weeklyRequestRef.current) return false;
      let entries = res.data;
      console.log('refreshWeeklyProjects: fetched entries:', entries);
      // Group by project, always include any project with at least one entry
      const grouped = {};
      entries.forEach(entry => {
        if (!grouped[entry.project_id]) {
          grouped[entry.project_id] = {
            id: entry.project_id,
            project_id: entry.project_id,
            original_project_id: entry.project_id,
            project_name: entry.project_name,
            user_id: selectedUser,
            hours: { mon: { id: null, value: '' }, tue: { id: null, value: '' }, wed: { id: null, value: '' }, thu: { id: null, value: '' }, fri: { id: null, value: '' }, sat: { id: null, value: '' }, sun: { id: null, value: '' } },
            submitted: true,
          };
        }
        const date = new Date(entry.date);
        const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1;
        const dayKey = daysOfWeek[dayIdx].key;
        grouped[entry.project_id].hours[dayKey] = { id: entry.id, value: entry.hours };
      });
      let projectsArr = Object.values(grouped);
      // Restore order from localStorage if available
      const orderKey = getOrderStorageKey(selectedUser, weekStart);
      const savedOrder = JSON.parse(localStorage.getItem(orderKey) || '[]');
      if (savedOrder.length > 0) {
        // Sort projectsArr by savedOrder, unknowns at the end
        projectsArr.sort((a, b) => {
          const ia = savedOrder.indexOf(a.project_id);
          const ib = savedOrder.indexOf(b.project_id);
          if (ia === -1 && ib === -1) return 0;
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });
      }
      const savedRows = projectsArr.map(cloneWeeklyEntry);
      setWeeklyProjects(savedRows.map(cloneWeeklyEntry));
      setSavedWeeklyProjects(savedRows);
      setSavedWeeklySignature(getWeeklyProjectsSignature(savedRows));
      setProjectEditingRowId(null);
      setRecentlySavedProjectIds([]);
      setValidationAttempted(false);
      return true;
    } catch (err) {
      if (requestId !== weeklyRequestRef.current) return false;
      setWeeklyLoadError(t('timeEntries.errors.refreshWeeklyProjects'));
      return false;
    } finally {
      if (requestId === weeklyRequestRef.current) setWeeklyLoading(false);
    }
  };

  const handleWeeklySubmit = async () => {
    setSaveNotice(null);
    setValidationAttempted(true);
    const issues = buildWeeklyValidationIssues({
      rows: weeklyProjects,
      selectedUser,
      weekStart,
      days: daysOfWeek,
      projects,
      t,
    });
    if (issues.length > 0) {
      const firstIssue = issues[0];
      window.requestAnimationFrame(() => {
        if (firstIssue.rowId) {
          rowRefs.current.get(firstIssue.rowId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else if (firstIssue.type === 'emptyWeek') {
          addEntryButtonRef.current?.focus();
        }
      });
      return;
    }
    // Prepare batch payload and collect zero-hour deletes
    const batchEntries = [];
    const deleteRequests = [];
    const updateRequests = [];
    weeklyProjects.forEach(entry => {
      const originalProjectId = entry.original_project_id || entry.project_id;
      const projectChanged = Boolean(entry.submitted && originalProjectId !== entry.project_id);
      daysOfWeek.forEach((day, i) => {
        const val = entry.hours[day.key]?.value;
        const num = val === '' || val === undefined ? 0 : parseFloat(val);
        const existingEntryId = entry.hours[day.key]?.id;
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        // Use local YYYY-MM-DD
        const isoDate = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
        if (projectChanged && existingEntryId) {
          if (num > 0) {
            updateRequests.push(
              axios.patch(`/api/time-entries/${existingEntryId}`, {
                project_id: entry.project_id,
                date: isoDate,
                hours: num,
              })
            );
          } else {
            deleteRequests.push(axios.delete(`/api/time-entries/${existingEntryId}`));
          }
        } else if (num > 0) {
          batchEntries.push({
            user_id: selectedUser,
            project_id: entry.project_id,
            date: isoDate,
            hours: num
          });
        } else {
          // If there was an entry for this day, delete it
          const id = entry.hours[day.key]?.id;
          if (id) {
            deleteRequests.push(axios.delete(`/api/time-entries/${id}`));
          }
        }
      });
    });
    const submittedProjectIds = weeklyProjects
      .filter((row) => {
        const savedRow = savedWeeklyProjects.find((candidate) => (
          candidate.id === row.id
          || candidate.project_id === (row.original_project_id || row.project_id)
        ));
        return getWeeklyProjectsSignature([row]) !== getWeeklyProjectsSignature(savedRow ? [savedRow] : []);
      })
      .map((row) => row.project_id)
      .filter(Boolean);
    setIsSubmitting(true);
    setSaveFeedback('idle');
    try {
      const payrollWarnings = [];
      if (updateRequests.length > 0) {
        const responses = await Promise.all(updateRequests);
        responses.forEach((response) => {
          if (response.data?.payrollWarning) payrollWarnings.push(response.data.payrollWarning);
        });
      }
      if (batchEntries.length > 0) {
        const response = await axios.post('/api/time-entries/batch', { entries: batchEntries });
        payrollWarnings.push(...(response.data?.payrollWarnings || []));
      }
      if (deleteRequests.length > 0) {
        await Promise.all(deleteRequests);
      }
      // Update table with backend data and lock rows
      // Save order to localStorage (in case new projects were added)
      setSavedProjectOrder(selectedUser, weekStart, weeklyProjects);
      await fetchTimeEntries();
      await refreshWeeklyProjects();
      await onDataChanged?.();
      setAnalyticsRevision((value) => value + 1);
      await refreshSessionStatus().catch(() => {});
      window.dispatchEvent(new Event('notifications:refresh'));
      setRecentlySavedProjectIds(submittedProjectIds);
      setSaveFeedback('saved');
      setValidationAttempted(false);
      const payrollSaveNotice = buildPayrollSaveNotice(payrollWarnings, projects, currentUser);
      if (payrollSaveNotice) setSaveNotice(payrollSaveNotice);
    } catch (err) {
      setSaveFeedback('error');
      setSaveNotice({
        severity: 'error',
        message: getApiErrorMessage(err, t, 'timeEntries.errors.submit'),
        actionLabel: 'Повторить',
        action: 'retrySave',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group timeEntries by project_name and submission_time, filtered by selected user
  const filteredEntries = timeEntries.filter(e => !selectedUser || e.user_id === selectedUser);
  const groupedEntries = Object.values(
    filteredEntries.reduce((acc, entry) => {
      const key = `${entry.project_name}|${entry.date}`;
      if (!acc[key]) {
        acc[key] = {
          project_name: entry.project_name,
          date: entry.date,
          total_hours: 0,
          hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
        };
      }
      // Find the day key for this entry
      const date = new Date(entry.date);
      const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Sun, 1=Mon...
      const dayKey = daysOfWeek[dayIdx].key;
      const hours = parseFloat(entry.hours[dayKey]?.value);
      acc[key].hours[dayKey] = hours;
      acc[key].total_hours += hours;
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  // In the log table, assign numbers so the most recent entry gets the largest number
  groupedEntries.forEach((entry, idx, arr) => entry.displayNumber = arr.length - idx);

  // eslint-disable-next-line no-unused-vars
  const handleEditOpen = (entry) => {
    // Find all entries for this project and submission_time
    const weekEntries = timeEntries.filter(e => e.project_name === entry.project_name && e.date === entry.date);
    // Build hours object for the week, always include all days
    const hours = {};
    daysOfWeek.forEach((day, idx) => {
      const dayEntry = weekEntries.find(e => {
        const date = new Date(e.date);
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
        return dayOfWeek === idx + 1;
      });
      hours[day.key] = dayEntry ? dayEntry.hours[day.key]?.value : '0';
    });
    setEditWeekEntry({
      id: weekEntries[0]?.id,
      project_id: weekEntries[0]?.project_id || '',
      hours,
      date: entry.date,
      user_id: weekEntries[0]?.user_id || '',
    });
    setEditDialogOpen(true);
    setEditError('');
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditWeekEntry(null);
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditLoading(true);
    setEditError('');
    try {
      const results = await Promise.all(
        daysOfWeek.map(async (day, i) => {
          const hours = parseFloat(editWeekEntry.hours[day.key]);
          const date = new Date(editWeekEntry.date);
          date.setDate(date.getDate() - date.getDay() + (i + 1));
          const dayEntry = timeEntries.find(e => {
            const entryDate = new Date(e.date);
            return (
              e.date === editWeekEntry.date &&
              e.project_name === groupedEntries.find(g => g.date === editWeekEntry.date && g.project_name === e.project_name)?.project_name &&
              entryDate.toDateString() === date.toDateString()
            );
          });
          try {
            if (hours && hours > 0) {
              if (dayEntry) {
                const response = await axios.patch(`/api/time-entries/${dayEntry.id}`, {
                  project_id: editWeekEntry.project_id,
                  date: date.toISOString(),
                  hours: {
                    ...dayEntry.hours,
                    [day.key]: hours,
                  },
                });
                return { payrollWarning: response.data?.payrollWarning || null, failedDay: null };
              } else {
                const response = await axios.post('/api/time-entries', {
                  project_id: editWeekEntry.project_id,
                  user_id: editWeekEntry.user_id,
                  date: date.toISOString(),
                  hours: {
                    ...dayEntry.hours,
                    [day.key]: hours,
                  },
                  description: '',
                });
                return { payrollWarning: response.data?.payrollWarning || null, failedDay: null };
              }
            } else if (dayEntry) {
              await axios.delete(`/api/time-entries/${dayEntry.id}`);
              return { payrollWarning: null, failedDay: null };
            } else {
              // No entry and no hours, nothing to do, treat as success
              return { payrollWarning: null, failedDay: null };
            }
          } catch (err) {
            // If deleting and error is 404, treat as success
            if (err?.response?.status === 404) {
              return { payrollWarning: null, failedDay: null };
            }
            return { payrollWarning: null, failedDay: day.label };
          }
        })
      );
      const editPayrollWarnings = results.map((result) => result?.payrollWarning).filter(Boolean);
      const editPayrollNotice = buildPayrollSaveNotice(editPayrollWarnings, projects, currentUser);
      if (editPayrollNotice) setSaveNotice(editPayrollNotice);
      const failedDays = results.map((result) => result?.failedDay).filter(Boolean);
      if (failedDays.length === daysOfWeek.length) {
        setEditError(t('timeEntries.errors.update')); 
      } else if (failedDays.length > 0) {
        setEditError(t('timeEntries.errors.updateSomeDays', { days: failedDays.join(', ') })); 
      } else {
        setEditDialogOpen(false);
        fetchTimeEntries();
        // Update weeklyProjects for the edited project/user/week
        setWeeklyProjects(prev => {
          const updated = prev.map(row => {
            if (
              row.project_id === editWeekEntry.project_id &&
              row.user_id === editWeekEntry.user_id &&
              row.submitted
            ) {
              // Set hours to '' for any day set to 0
              const newHours = { ...editWeekEntry.hours };
              Object.keys(newHours).forEach(dayKey => {
                if (!newHours[dayKey] || parseFloat(newHours[dayKey]) === 0) {
                  newHours[dayKey] = '';
                }
              });
              return { ...row, hours: newHours };
            }
            return row;
          });
          if (selectedUser) {
            localStorage.setItem(LOCAL_STORAGE_KEY(selectedUser), JSON.stringify(updated));
          }
          return updated;
        });
      }
    } finally {
      setEditLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!entryToDelete) return;
    try {
      // Find all time entries for this project and submission time
      const entriesToDelete = timeEntries.filter(e => 
        e.project_name === entryToDelete.project_name && 
        e.date === entryToDelete.date
      );
      await Promise.all(entriesToDelete.map(e => 
        axios.delete(`/api/time-entries/${e.id}`)
      ));
      await fetchTimeEntries();
      await refreshWeeklyProjects();
      await onDataChanged?.();
      setAnalyticsRevision((value) => value + 1);
      await refreshSessionStatus().catch(() => {});
      window.dispatchEvent(new Event('notifications:refresh'));
      setConfirmDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      setSaveNotice({ severity: 'error', message: t('timeEntries.errors.deleteEntries') });
      setConfirmDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Calculate total logged hours for the week
  const totalLogged = dayTotals.reduce((a, b) => a + b, 0);
  const isDirty = !weeklyLoading && getWeeklyProjectsSignature(weeklyProjects) !== savedWeeklySignature;
  const validationIssues = useMemo(() => validationAttempted
    ? buildWeeklyValidationIssues({
      rows: weeklyProjects,
      selectedUser,
      weekStart,
      days: daysOfWeek,
      projects,
      t,
    })
    : [], [daysOfWeek, projects, selectedUser, t, validationAttempted, weekStart, weeklyProjects]);
  const firstValidationIssue = validationIssues[0] || null;

  const requestWeekChange = (nextWeek) => {
    const next = getMonday(new Date(nextWeek));
    if (next.toDateString() === getMonday(weekStart).toDateString()) return;
    if (isDirty && !window.confirm('Есть несохранённые изменения. Перейти к другой неделе без сохранения?')) return;
    setSaveFeedback('idle');
    setRecentlySavedProjectIds([]);
    setWeeklyLoadError('');
    setValidationAttempted(false);
    setWeekStart(next);
    if (embedded && onWeekChange) onWeekChange(next);
  };

  const closeRowMenu = () => {
    setRowMenuAnchor(null);
    setRowMenuIndex(null);
  };

  const requestDeleteRow = (idx) => {
    const row = weeklyProjects[idx];
    closeRowMenu();
    if (!row?.submitted) {
      setWeeklyProjects((current) => current.filter((_, rowIndex) => rowIndex !== idx));
      return;
    }
    setRowToDeleteIndex(idx);
  };

  const confirmDeleteRow = async () => {
    if (rowToDeleteIndex === null) return;
    const index = rowToDeleteIndex;
    setRowToDeleteIndex(null);
    await handleDeleteProject(index);
  };

  const handleUndoWeekChanges = () => {
    const restoredRows = savedWeeklyProjects.length > 0
      ? savedWeeklyProjects.map(cloneWeeklyEntry)
      : [initialEntry(selectedUser)];
    setWeeklyProjects(restoredRows);
    setProjectEditingRowId(null);
    setProjectSearchByEntry({});
    setSaveFeedback('idle');
    setRecentlySavedProjectIds([]);
    setValidationAttempted(false);
    setSaveNotice(null);
    setSavedProjectOrder(selectedUser, weekStart, restoredRows);
  };

  const startProjectEdit = (idx) => {
    setProjectEditingRowId(weeklyProjects[idx]?.id || null);
    closeRowMenu();
  };

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (isDirty) setSaveFeedback('idle');
  }, [isDirty]);

  useEffect(() => {
    if (saveFeedback !== 'saved') return undefined;
    const timer = window.setTimeout(() => {
      setSaveFeedback('idle');
      setRecentlySavedProjectIds([]);
    }, 2800);
    return () => window.clearTimeout(timer);
  }, [saveFeedback]);

  // Handler for hour changes
  const handleHourChange = (idx, dayKey, value) => {
    setWeeklyProjects(prev => {
      const updated = [...prev];
      const entry = { ...updated[idx] };
      entry.hours = { ...entry.hours, [dayKey]: { ...entry.hours[dayKey], value } };
      updated[idx] = entry;
      return updated;
    });
  };

  // Add a new project row for the week
  const handleAddProject = () => {
    const newEntry = initialEntry(selectedUser);
    setWeeklyProjects(prev => {
      const updated = [...prev, newEntry];
      // Save new order to localStorage
      const orderKey = getOrderStorageKey(selectedUser, weekStart);
      const order = updated.map(e => e.project_id).filter(Boolean);
      localStorage.setItem(orderKey, JSON.stringify(order));
      return updated;
    });
  };

  const closeSaveNotice = () => setSaveNotice(null);
  const handleSaveNoticeAction = () => {
    const notice = saveNotice;
    setSaveNotice(null);
    if (notice?.action === 'retrySave') {
      handleWeeklySubmit();
    } else if (notice?.actionPath) {
      navigate(notice.actionPath);
    }
  };

  // Delete a project row
  const handleDeleteProject = async idx => {
    const entry = weeklyProjects[idx];
    try {
      if (entry.submitted) {
        const hourIds = Object.values(entry.hours || {})
          .map(day => day && day.id)
          .filter(Boolean);
        if (hourIds.length > 0) {
          await Promise.all(hourIds.map(id => axios.delete(`/api/time-entries/${id}`)));
        } else if (entry.project_id) {
          const userForDelete = entry.user_id || selectedUser;
          if (!userForDelete) {
            throw new Error(t('timeEntries.validation.userRequired')); 
          }
          await axios.post('/api/time-entries/bulk-delete', {
            user_id: userForDelete,
            project_id: entry.project_id,
            week_start: weekStart.toISOString(),
          });
        }
      }
      // Remove from order in localStorage
      const orderKey = getOrderStorageKey(selectedUser, weekStart);
      const prevOrder = JSON.parse(localStorage.getItem(orderKey) || '[]');
      const newOrder = prevOrder.filter(pid => pid !== entry.project_id);
      localStorage.setItem(orderKey, JSON.stringify(newOrder));
      await refreshWeeklyProjects();
      await fetchTimeEntries();
      await onDataChanged?.();
      setAnalyticsRevision((value) => value + 1);
      await refreshSessionStatus().catch(() => {});
      window.dispatchEvent(new Event('notifications:refresh'));
    } catch (err) {
      console.error('Error deleting project entries:', err);
      setSaveNotice({ severity: 'error', message: getApiErrorMessage(err, t, 'timeEntries.errors.deleteProjectEntries') });
    }
  };

  // Carousel scroll handlers
  const scrollCarousel = dir => {
    if (carouselRef) {
      const scrollAmount = 160; // px, adjust as needed
      carouselRef.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    }
  };

  const getSelectableProjectsForRow = (entry, idx) => (
    projects
      .filter((project) => project.active !== 0 || entry.project_id === project.id)
      .filter((project) => (
        !weeklyProjects.some((row, rowIndex) => rowIndex !== idx && row.project_id === project.id)
        || entry.project_id === project.id
      ))
      .filter((project) => matchesProjectSearch(project, projectSearchByEntry[entry.id]))
  );

  const getSelectableProjectGroups = (entry, idx) => {
    const selectableProjects = getSelectableProjectsForRow(entry, idx);
    return PROJECT_CATEGORY_ORDER
      .map((categoryValue) => ({
        categoryValue,
        meta: getProjectCategoryMeta(categoryValue),
        projects: selectableProjects.filter(
          (project) => (project.category || PROJECT_CATEGORY_TRANSITION.value) === categoryValue
        ),
      }))
      .filter((group) => group.projects.length > 0);
  };

  const Layout = embedded ? EmbeddedTimeEntriesLayout : PageLayout;
  const projectColumnWidth = embedded ? 348 : 550;
  const projectSelectWidth = embedded ? 328 : 530;
  const projectTextWidth = embedded ? 298 : 460;
  const totalColumnWidth = embedded ? 44 : 60;
  const actionColumnWidth = embedded ? 32 : 44;
  const editorDisabled = weeklyLoading || Boolean(weeklyLoadError);
  const footerStatus = firstValidationIssue?.message || (saveFeedback === 'saved'
    ? 'Все изменения сохранены'
    : saveFeedback === 'error'
      ? 'Не удалось сохранить изменения'
      : isDirty
        ? 'Есть несохранённые изменения'
        : 'Все изменения сохранены');
  const footerStatusColor = firstValidationIssue
    ? '#B42318'
    : saveFeedback === 'error'
      ? '#B42318'
      : isDirty
        ? '#B54708'
        : '#667085';

  return (
    <Layout
      title={t('timeEntries.title')}
      subtitle={t('timeEntries.weekHoursSummary', {
        logged: totalLogged,
        required: requiredHoursTotal,
      })}
      headerCenter={<WeekSelector weekStart={weekStart} onChange={requestWeekChange} />}
      toolbar={
        <PageToolbar sx={{ py: { xs: 1, md: 0.75 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100%' }}>
            <Button
              variant="outlined"
              size="small"
              sx={{
                mr: 2,
                minWidth: 168,
                height: 40,
                borderRadius: '8px',
                px: 2.5,
                py: 0.8,
                fontSize: 15,
                textTransform: 'none',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0,
                alignSelf: 'center',
                border: '1px solid #C5C9D3',
                background: '#ffffff',
                boxShadow: 'none',
                color: '#4A69D9',
                '&:hover': {
                  background: '#fff',
                },
              }}
              onClick={() => setWeeksToShow(w => w + 4)}
            >
              + {t('timeEntries.earlierWeeks')}
            </Button>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <WeekCarousel
                weeks={allWeeks.map(w => ({
                  ...w,
                  isCurrent: w.isCurrent,
                  isSelected: w.isSelected,
                  loggedHours: w.loggedHours,
                }))}
                selectedWeek={weekStart}
                onSelectWeek={dateStr => requestWeekChange(new Date(dateStr))}
                requiredHours={requiredHoursTotal}
                onPrev={() => scrollCarousel(-1)}
                onNext={() => scrollCarousel(1)}
                carouselRef={el => setCarouselRef(el)}
                compact
              />
            </Box>
          </Box>
        </PageToolbar>
      }
      calendar={embedded ? (
        <MonthHeatmapCalendar
          compact
          month={calendarMonth}
          selectedWeek={weekStart}
          entries={timeEntries}
          loading={historyLoading}
          error={historyError}
          onMonthChange={(nextMonth) => setCalendarMonth(startOfMonth(nextMonth))}
          onSelectWeek={requestWeekChange}
          onRetry={fetchTimeEntries}
        />
      ) : null}
      analytics={embedded ? (
        <MineTimeAnalytics
          data={mineAnalytics.data}
          loading={mineAnalytics.loading}
          error={mineAnalytics.error}
          onRetry={mineAnalytics.reload}
          range={analyticsRange}
          onRangeChange={setAnalyticsRange}
        />
      ) : null}
      footer={embedded ? (
        <Box sx={{ minHeight: 60, px: { xs: 1.25, sm: 2 }, py: 1, display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, borderTop: '1px solid #E8EBF2', bgcolor: '#FFFFFF', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          <Button
            ref={addEntryButtonRef}
            size="small"
            startIcon={<Add />}
            onClick={handleAddProject}
            disabled={editorDisabled || isSubmitting}
            sx={{
              color: '#4A68D9',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { color: '#3857C4', bgcolor: '#F7F8FD' },
            }}
          >
            {t('timeEntries.addEntry')}
          </Button>
          <Tooltip title="Норма недели: 5 рабочих дней × 8 часов" arrow>
            <Typography sx={{ ml: { md: 'auto' }, fontSize: 13, fontWeight: 700, color: totalLogged > WEEKLY_REQUIRED_HOURS ? '#B42318' : '#1D2433', whiteSpace: 'nowrap' }}>{totalLogged} / {WEEKLY_REQUIRED_HOURS} ч</Typography>
          </Tooltip>
          <Tooltip title={footerStatus} disableHoverListener={footerStatus.length < 54} arrow>
            <Box
              id="weekly-editor-status"
              aria-live="polite"
              sx={{
                minWidth: 0,
                maxWidth: { xs: '100%', md: 430 },
                height: { xs: 32, md: 20 },
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography sx={{ fontSize: 12, lineHeight: '16px', color: footerStatusColor, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: { xs: 'normal', md: 'nowrap' }, display: { xs: '-webkit-box', md: 'block' }, WebkitLineClamp: { xs: 2, md: 'unset' }, WebkitBoxOrient: 'vertical' }}>
                {footerStatus}
              </Typography>
            </Box>
          </Tooltip>
          <Button
            variant="text"
            size="small"
            startIcon={<UndoRounded />}
            onClick={handleUndoWeekChanges}
            disabled={!isDirty || editorDisabled || isSubmitting}
            sx={{ color: '#4A68D9', textTransform: 'none', whiteSpace: 'nowrap' }}
          >
            Отменить изменения
          </Button>
          <Button variant="contained" size="small" onClick={handleWeeklySubmit} disabled={!isDirty || editorDisabled || isSubmitting} startIcon={isSubmitting ? <CircularProgress size={15} color="inherit" /> : undefined} sx={{ minWidth: 150, textTransform: 'none', bgcolor: '#4A69D9', '&:hover': { bgcolor: '#3857C4' } }}>
            {isSubmitting ? 'Сохранение…' : saveFeedback === 'saved' ? 'Сохранено' : 'Сохранить неделю'}
          </Button>
        </Box>
      ) : null}
    >
      {embedded && weeklyLoadError ? (
        <Box role="alert" sx={{ height: '100%', display: 'grid', placeItems: 'center', p: 2, textAlign: 'center' }}>
          <Box>
            <Typography sx={{ fontSize: 14, color: '#B42318', mb: 1 }}>{weeklyLoadError}</Typography>
            <Button size="small" onClick={refreshWeeklyProjects}>Повторить</Button>
          </Box>
        </Box>
      ) : embedded && weeklyLoading && weeklyProjects.length === 0 ? (
        <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><CircularProgress size={28} /></Box>
      ) : <TableContainer ref={weeklyTableRef} component={Paper} sx={{ height: embedded ? '100%' : 'auto', minHeight: 0, mb: embedded ? 0 : 3, overflow: 'auto', border: embedded ? 0 : '1px solid #E2E4E9', borderRadius: embedded ? 0 : '12px', boxShadow: embedded ? 0 : 1, pointerEvents: editorDisabled ? 'none' : 'auto', opacity: editorDisabled ? 0.65 : 1 }}>
        <Table size="small" stickyHeader={embedded} sx={{
          minWidth: embedded ? 940 : undefined,
          ...(embedded ? {
            '& thead tr:first-of-type th': { position: 'sticky', top: 0, zIndex: 4, bgcolor: '#FFFFFF' },
            '& thead tr:nth-of-type(2) th': { position: 'sticky', top: 76, zIndex: 4, bgcolor: '#FFFFFF' },
            '& tbody tr > td:first-of-type': { position: 'sticky', left: 0, zIndex: 2, bgcolor: '#FFFFFF' },
            '& tbody tr > td:nth-of-type(2)': { position: 'sticky', left: 40, zIndex: 2, bgcolor: '#FFFFFF' },
            '& thead tr:first-of-type > th:first-of-type': { left: 0, zIndex: 6, bgcolor: '#FFFFFF' },
            '& thead tr:nth-of-type(2) > th:first-of-type': { left: 0, zIndex: 5 },
            '& thead tr:nth-of-type(2) > th:nth-of-type(2)': { left: 40, zIndex: 5 },
          } : {}),
        }}>
          <TableHead>
            <TableRow sx={{ height: 40, minHeight: 40 }}>
              {embedded ? (
                <EmbeddedWeekTableHeading
                  weekStart={weekStart}
                  dateLocale={dateLocale}
                  onWeekChange={requestWeekChange}
                  projectColumnWidth={projectColumnWidth}
                />
              ) : <>
                <TableCell align="center" sx={{ width: 40, fontWeight: 'bold', p: 0, pt: 1 }} />
                <TableCell align="left" sx={{ width: projectColumnWidth, minWidth: projectColumnWidth, maxWidth: projectColumnWidth, textAlign: 'left', fontWeight: 'bold', p: 0, pt: 1 }} />
              </>}
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, fontWeight: 'bold', p: 0, pt: 1, minWidth: 63, maxWidth: 73, width: 67 }}>
                  <DayHourBar
                    hours={dayTotals[i]}
                    isWeekend={day.key === 'sat' || day.key === 'sun'}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginTop: 2,
                      color: dayTotals[i] >= 8 ? '#5673DC' : undefined,
                      borderBottom: dayTotals[i] >= 8 ? '3px solid #5673DC' : undefined,
                      display: 'inline-block',
                      paddingBottom: 1,
                      transition: 'color 0.2s, border-bottom 0.2s',
                    }}
                  >
                    {day.label}
                  </div>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: totalColumnWidth, minWidth: totalColumnWidth, maxWidth: totalColumnWidth, px: 0, py: 0, overflow: 'hidden',
                fontWeight: totalLogged < requiredHoursTotal ? 'normal' : 'bold',
                fontSize: embedded ? 16 : 18,
                color: totalLogged < requiredHoursTotal ? 'black' : (totalLogged === requiredHoursTotal ? '#5673DC' : 'red')
              }}>
                {totalLogged}/{requiredHoursTotal}
              </TableCell>
              <TableCell align="center" sx={{ width: actionColumnWidth, minWidth: actionColumnWidth, maxWidth: actionColumnWidth, fontWeight: 'bold', p: 0, pt: 1 }}></TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center" sx={{ width: 40, fontWeight: 'bold' }}>#</TableCell>
              <TableCell sx={{ width: projectColumnWidth, minWidth: projectColumnWidth, maxWidth: projectColumnWidth, textAlign: 'left', fontWeight: 'bold', p: 1, pt: 1 }}>{t('timeEntries.project')}</TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 63, maxWidth: 73, width: 67, px: 0.5, py: 0.5, fontWeight: 'normal', fontSize: 13 }}>
                  {format(new Date(weekStart.getTime() + i * 86400000), 'dd.MM', { locale: dateLocale })}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: totalColumnWidth, minWidth: totalColumnWidth, maxWidth: totalColumnWidth, px: 0, overflow: 'hidden' }}>{t('timeEntries.total')}</TableCell>
              <TableCell align="center" sx={{ width: actionColumnWidth, minWidth: actionColumnWidth, maxWidth: actionColumnWidth, p: 0, fontWeight: 'bold' }} aria-label={t('timeEntries.actions')}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyProjects.map((entry, idx) => {
              const rowIssues = validationIssues.filter((issue) => issue.rowId === entry.id);
              const rowInvalid = rowIssues.length > 0;
              return (
              <TableRow
                key={entry.id}
                ref={(node) => {
                  if (node) rowRefs.current.set(entry.id, node);
                  else rowRefs.current.delete(entry.id);
                }}
                aria-invalid={rowInvalid ? 'true' : undefined}
                aria-describedby={rowInvalid ? 'weekly-editor-status' : undefined}
                data-recently-saved={recentlySavedProjectIds.includes(entry.project_id) ? 'true' : 'false'}
                data-validation-error={rowInvalid ? 'true' : 'false'}
                sx={{
                  '& > .MuiTableCell-root': {
                    transition: 'background-color 320ms ease',
                    ...(rowInvalid
                      ? { backgroundColor: '#FFF7F7' }
                      : recentlySavedProjectIds.includes(entry.project_id)
                      ? { backgroundColor: '#ECF8F0' }
                      : {}),
                  },
                }}
              >
                <TableCell align="center" sx={{ width: 40, fontWeight: 'bold' }}>{idx + 1}</TableCell>
                <TableCell sx={{ width: projectColumnWidth, minWidth: projectColumnWidth, maxWidth: projectColumnWidth, p: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 0, pr: embedded ? 0 : 1 }}>
                      {(!entry.submitted || projectEditingRowId === entry.id) ? (
                        <TextField
                          select
                          size="small"
                          autoFocus={Boolean(entry.submitted && projectEditingRowId === entry.id)}
                          value={entry.project_id}
                          onMouseDown={(event) => {
                            if (!embedded) return;
                            const width = event.currentTarget.getBoundingClientRect().width;
                            if (width) setProjectMenuWidth(Math.ceil(width));
                          }}
                          onChange={e => {
                            const value = e.target.value;
                            setWeeklyProjects(prev => {
                              const updated = [...prev];
                              updated[idx] = { ...updated[idx], project_id: value };
                              setSavedProjectOrder(selectedUser, weekStart, updated);
                              return updated;
                            });
                            setProjectSearchByEntry((current) => ({
                              ...current,
                              [entry.id]: '',
                            }));
                            if (entry.submitted) setProjectEditingRowId(null);
                          }}
                          sx={{
                            width: embedded ? '100%' : projectSelectWidth,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            '& .MuiOutlinedInput-root': {
                              fontSize: 11,
                              borderRadius: '12px',
                              backgroundColor: '#FFFFFF',
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#E2E4E9',
                              },
                              '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#C5C9D3',
                              },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#4A68D9',
                                borderWidth: 1,
                              },
                            },
                            '& .MuiSelect-select': {
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: 13,
                              color: '#273041',
                            },
                          }}
                          SelectProps={{
                            open: entry.submitted ? projectEditingRowId === entry.id : undefined,
                            displayEmpty: true,
                            onOpen: (event) => {
                              if (!embedded) return;
                              const anchor = event.currentTarget?.closest?.('.MuiInputBase-root')
                                || event.target?.closest?.('.MuiInputBase-root');
                              const width = anchor?.getBoundingClientRect?.().width;
                              if (width) setProjectMenuWidth(Math.ceil(width));
                            },
                            onClose: () => {
                              setProjectSearchByEntry((current) => ({
                                ...current,
                                [entry.id]: '',
                              }));
                              if (entry.submitted) setProjectEditingRowId(null);
                            },
                            renderValue: (selected) => {
                              if (!selected) {
                                return t('timeEntries.selectProject');
                              }
                              const selectedProject = projects.find((project) => project.id === selected);
                              return selectedProject ? getProjectDisplay(selectedProject) : t('timeEntries.selectProject');
                            },
                            MenuProps: {
                              autoFocus: false,
                              disableAutoFocusItem: true,
                              MenuListProps: {
                                autoFocusItem: false,
                              },
                              PaperProps: {
                                sx: {
                                  fontSize: 11,
                                  width: embedded ? projectMenuWidth || projectSelectWidth : projectSelectWidth,
                                  maxHeight: 420,
                                  mt: 1,
                                  borderRadius: '16px',
                                  border: '1px solid #DCE4F1',
                                  boxShadow: '0 14px 32px rgba(77, 97, 163, 0.14)',
                                  overflowX: 'hidden',
                                  overflowY: 'auto',
                                  '& .MuiMenu-list': {
                                    py: 0.5,
                                  },
                                  '& .MuiListSubheader-root': {
                                    backgroundColor: '#F1F5FB',
                                    color: '#566580',
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    lineHeight: '26px',
                                    paddingTop: '3px',
                                    paddingBottom: '3px',
                                    paddingLeft: '16px',
                                    paddingRight: '16px',
                                    borderTop: '1px solid #D5DEEE',
                                    borderBottom: '1px solid #E2EAF6',
                                  },
                                },
                              },
                            },
                          }}
                        >
                          <MenuItem value="" disabled>{t('timeEntries.selectProject')}</MenuItem>
                          <ListSubheader disableSticky sx={{ backgroundColor: '#FFFFFF', py: 1, px: 1.5 }}>
                            <TextField
                              size="small"
                              fullWidth
                              autoFocus
                              placeholder="Поиск по коду, названию или категории"
                              value={projectSearchByEntry[entry.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setProjectSearchByEntry((current) => ({
                                  ...current,
                                  [entry.id]: value,
                                }));
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <SearchIcon sx={{ fontSize: 18, color: '#8A96AD' }} />
                                  </InputAdornment>
                                ),
                              }}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: '10px',
                                  backgroundColor: '#F8FAFE',
                                },
                                '& .MuiOutlinedInput-input': {
                                  fontSize: 13,
                                  py: 1,
                                },
                              }}
                            />
                          </ListSubheader>
                          {getSelectableProjectGroups(entry, idx).flatMap((group) => ([
                            <ListSubheader
                              key={`header-${group.categoryValue}`}
                              disableSticky
                              sx={{
                                mt: group.categoryValue === PROJECT_CATEGORY_ORDER[0] ? 0 : 0.5,
                                borderTop: group.categoryValue === PROJECT_CATEGORY_ORDER[0] ? 'none' : '2px solid #D7E0EF',
                                boxShadow: group.categoryValue === PROJECT_CATEGORY_ORDER[0] ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                              }}
                            >
                              {group.meta.label}
                              </ListSubheader>,
                            ...group.projects.map((project) => (
                              <MenuItem
                                key={project.id}
                                value={project.id}
                                sx={{
                                  alignItems: 'flex-start',
                                  py: 0.75,
                                  px: 1.5,
                                  mx: 0.75,
                                  my: 0.125,
                                  minHeight: 48,
                                  borderRadius: 2.5,
                                  transition: 'background-color 0.15s ease',
                                  '&:hover': {
                                    backgroundColor: '#F5F8FF',
                                  },
                                  '&.Mui-selected': {
                                    backgroundColor: '#EEF3FF',
                                  },
                                  '&.Mui-selected:hover': {
                                    backgroundColor: '#E7EEFF',
                                  },
                                }}
                              >
                                <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      fontSize: 13,
                                      color: '#273041',
                                      fontWeight: 500,
                                      lineHeight: 1.35,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: embedded ? '100%' : projectTextWidth,
                                    }}
                                    title={getProjectDisplay(project)}
                                  >
                                    {getProjectDisplay(project)}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 10.5,
                                      color: '#8A96AD',
                                      lineHeight: 1.35,
                                      mt: 0.15,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: embedded ? '100%' : projectTextWidth,
                                    }}
                                    title={getProjectStateText(project, t) || group.meta.label}
                                  >
                                    {getProjectStateText(project, t) || group.meta.label}
                                  </Typography>
                                </Box>
                              </MenuItem>
                            )),
                          ]))}
                          {getSelectableProjectGroups(entry, idx).length === 0 && (
                            <MenuItem disabled sx={{ fontSize: 13, color: '#8A96AD', py: 1.25 }}>
                              Ничего не найдено
                            </MenuItem>
                          )}
                          {/*
                          {projects
                            .filter(project => project.active !== 0)
                            .filter(project =>
                              !weeklyProjects.some((row, i) => i !== idx && row.project_id === project.id)
                              || entry.project_id === project.id
                            )
                            .map(project => (
                              <MenuItem key={project.id} value={project.id}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    maxWidth: 500,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                    fontSize: 13,
                                  }}
                                  title={getProjectWithCategoryDisplay(project)}
                                >
                                  {getProjectWithCategoryDisplay(project)}
                                </span>
                              </MenuItem>
                            ))}
                          */}
                        </TextField>
                      ) : (
                        (() => {
                          const selectedProject = projects.find((project) => project.id === entry.project_id);
                          const categoryMeta = getProjectCategoryMeta(selectedProject?.category);
                          return (
                            <Tooltip
                              title={getProjectWithCategoryDisplay(selectedProject) || entry.project_name}
                              placement="top"
                              arrow
                            >
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                                <Typography
                                  sx={{
                                    maxWidth: 530,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    verticalAlign: 'middle',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#273041',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  {getProjectDisplay(selectedProject) || entry.project_name}
                                </Typography>
                                <Typography
                                  sx={{
                                    maxWidth: 530,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    fontSize: 11,
                                    color: '#7F8BA2',
                                    lineHeight: 1.35,
                                    mt: 0.25,
                                  }}
                                >
                                  {selectedProject?.active === 0
                                    ? `${categoryMeta.label} • ${t('projects.closedStatus')}`
                                    : categoryMeta.label}
                                </Typography>
                              </Box>
                            </Tooltip>
                          );
                        })()
                      )}
                    </Box>
                  </Box>
                </TableCell>
                {daysOfWeek.map(day => {
                  const activeProject = projects.some((project) => project.id === entry.project_id && project.active !== 0);
                  const rowReadOnly = Boolean(entry.submitted && !activeProject);
                  const savedEntry = savedWeeklyProjects.find((savedRow) => (
                    savedRow.id === entry.id
                    || savedRow.project_id === (entry.original_project_id || entry.project_id)
                  ));
                  const currentValue = Number(entry.hours[day.key]?.value || 0);
                  const savedValue = Number(savedEntry?.hours?.[day.key]?.value || 0);
                  const changed = currentValue !== savedValue;
                  return (
                    <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 63, maxWidth: 73, width: 67, px: 0.5, py: 0.5 }}>
                      <HourInput
                        value={entry.hours[day.key]?.value || ''}
                        onChange={val => handleHourChange(idx, day.key, val)}
                        disabled={editorDisabled || isSubmitting || rowReadOnly}
                        changed={changed}
                        invalid={rowIssues.some((issue) => issue.type === 'zeroHours' || (issue.type === 'invalidHours' && issue.dayKey === day.key))}
                        decrementLabel={`Уменьшить часы за ${day.label}`}
                        incrementLabel={`Увеличить часы за ${day.label}`}
                      />
                    </TableCell>
                  );
                })}
                <TableCell align="center" sx={{ fontWeight: 'bold', width: totalColumnWidth, minWidth: totalColumnWidth, maxWidth: totalColumnWidth, px: 0, overflow: 'hidden' }}>{projectTotals[idx]}</TableCell>
                <TableCell align="center" sx={{ width: actionColumnWidth, minWidth: actionColumnWidth, maxWidth: actionColumnWidth, p: 0 }}>
                  {(() => {
                    const activeProject = projects.some((project) => project.id === entry.project_id && project.active !== 0);
                    const actionsDisabled = Boolean(entry.submitted && !activeProject);
                    return (
                      <Tooltip title={actionsDisabled ? 'Закрытый проект доступен только для просмотра' : 'Действия со строкой'} arrow>
                        <span>
                          <IconButton
                            size="small"
                            aria-label="Действия со строкой"
                            disabled={actionsDisabled}
                            onClick={(event) => { setRowMenuAnchor(event.currentTarget); setRowMenuIndex(idx); }}
                            sx={{ width: 32, height: 32 }}
                          >
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    );
                  })()}
                </TableCell>
              </TableRow>
              );
            })}
            {!embedded && <TableRow>
              <TableCell colSpan={daysOfWeek.length + 4} sx={{ border: 'none', p: 1 }}>
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleAddProject}
                  sx={{ mt: 1, fontWeight: 'normal', fontSize: 16, textTransform: 'none', pl: 0, minHeight: 'unset', minWidth: 'unset', p: 0, color: '#4A69D9' }}
                >
                  {t('timeEntries.addProject')}
                </Button>
              </TableCell>
            </TableRow>}
          </TableBody>
        </Table>
      </TableContainer>}
      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor) && rowMenuIndex !== null}
        onClose={closeRowMenu}
        slotProps={{
          paper: {
            sx: {
              minWidth: 164,
              border: '1px solid #E2E4E9',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(31,42,68,.12)',
              '& .MuiMenu-list': { py: 0.5 },
              '& .MuiMenuItem-root': {
                minHeight: 36,
                px: 1.25,
                py: 0.5,
                fontSize: 13,
                lineHeight: '18px',
              },
              '& .MuiListItemIcon-root': { minWidth: 26 },
              '& .MuiSvgIcon-root': { fontSize: 18 },
            },
          },
        }}
      >
        {rowMenuIndex !== null && weeklyProjects[rowMenuIndex]?.submitted ? [
          <MenuItem key="change-project" onClick={() => startProjectEdit(rowMenuIndex)}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>Изменить проект
          </MenuItem>,
          <MenuItem key="delete" onClick={() => requestDeleteRow(rowMenuIndex)} sx={{ color: '#B42318' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>Удалить
          </MenuItem>,
        ] : (
          <MenuItem onClick={() => requestDeleteRow(rowMenuIndex)} sx={{ color: '#B42318' }}>
            <ListItemIcon><Delete fontSize="small" color="error" /></ListItemIcon>Удалить строку
          </MenuItem>
        )}
      </Menu>
      {!embedded && <Box sx={{ display: 'flex', justifyContent: 'left', my: 2 }}>
        <Button
          variant="contained"
          onClick={handleWeeklySubmit}
          sx={{
            backgroundColor: '#8196E4',
            color: '#FFFFFF',
            borderRadius: '8px',
            px: 2,
            py: 0.8,
            fontSize: 16,
            textTransform: 'none',
            boxShadow: 3,
            '&:hover': {
              backgroundColor: '#4A69D9',
            },
          }}
        >
          {t('timeEntries.submitWeek')}
        </Button>
      </Box>}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="lg" fullWidth>
        <DialogTitle>{t('timeEntries.editTitle')}</DialogTitle>
        <SingleProjectWeekEditor
          entry={editWeekEntry || { project_id: '', hours: {} }}
          projects={projects}
          daysOfWeek={daysOfWeek}
          weekStart={getMonday(new Date(editWeekEntry?.date || new Date()))}
          onChange={setEditWeekEntry}
          onSave={handleEditSave}
          onCancel={handleEditClose}
          error={editError}
          loading={editLoading}
        />
      </Dialog>

      <ConfirmationDialog
        open={rowToDeleteIndex !== null}
        title="Удалить часы проекта?"
        content={rowToDeleteIndex !== null ? `Все сохранённые часы проекта «${projects.find((project) => project.id === weeklyProjects[rowToDeleteIndex]?.project_id)?.name || weeklyProjects[rowToDeleteIndex]?.project_name || ''}» за выбранную неделю будут удалены.` : ''}
        onConfirm={confirmDeleteRow}
        onCancel={() => setRowToDeleteIndex(null)}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
      />

      <ConfirmationDialog
        open={confirmDialogOpen}
        title={t('timeEntries.deleteTitle')}
        content={entryToDelete ? t('timeEntries.deleteConfirm', { project: entryToDelete.project_name, date: entryToDelete.date ? format(new Date(entryToDelete.date), 'PP', { locale: dateLocale }) : '' }) : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDialogOpen(false); setEntryToDelete(null); }}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
      />
      <Snackbar
        open={Boolean(saveNotice)}
        autoHideDuration={saveNotice?.autoHideDuration ?? null}
        onClose={closeSaveNotice}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          top: { xs: 12, sm: '88px !important' },
          right: { xs: 12, sm: 24 },
          left: { xs: 12, sm: 'auto' },
          maxWidth: { xs: 'calc(100vw - 24px)', sm: 420 },
          '& .MuiAlert-root': { width: '100%' },
        }}
      >
        <Alert
          severity={saveNotice?.severity || 'info'}
          variant="outlined"
          sx={{
            alignItems: 'flex-start',
            borderRadius: '12px',
            bgcolor: saveNotice?.severity === 'error' ? '#FEF3F2' : '#FFFAEB',
            borderColor: saveNotice?.severity === 'error' ? '#FECDCA' : '#FEDF89',
            color: '#344054',
            boxShadow: '0 10px 30px rgba(31,42,68,.14)',
            '& .MuiAlert-message': { minWidth: 0, fontSize: 13, lineHeight: '18px' },
            '& .MuiAlert-action': { alignItems: 'center', pt: 0, pl: 1 },
          }}
          action={(
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              {saveNotice?.actionLabel && (
                <Button size="small" onClick={handleSaveNoticeAction} sx={{ color: '#3857C4', minWidth: 0, px: 0.75, whiteSpace: 'nowrap', textTransform: 'none' }}>
                  {saveNotice.actionLabel}
                </Button>
              )}
              <IconButton size="small" aria-label="Закрыть уведомление" onClick={closeSaveNotice} sx={{ color: '#667085' }}>
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
          )}
        >
          {saveNotice?.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
}

export default TimeEntries; 
