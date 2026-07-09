import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip
} from '@mui/material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import axios from 'axios';
import { Add, Delete, Remove, Edit as EditIcon, Save as SaveIcon, Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import SingleProjectWeekEditor from '../components/SingleProjectWeekEditor';
import DayHourBar from '../components/DayHourBar';
import useTimeEntries from '../hooks/useTimeEntries';
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

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const requiredHoursPerDay = {
  mon: 8,
  tue: 8,
  wed: 8,
  thu: 8,
  fri: 8,
  sat: 0,
  sun: 0,
};

function getMonday(d) {
  d = new Date(d);
  var day = d.getDay(),
    diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(d.setDate(diff));
}

function HourInput({ value, onChange, disabled }) {
  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(0, (parseFloat(value) || 0) - 1);
    onChange(newValue === 0 ? '' : newValue);
  };
  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(24, (parseFloat(value) || 0) + 1);
    onChange(newValue);
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 2, px: 0.5, py: 0.2, minWidth: 48, justifyContent: 'center', background: '#fff' }}>
      <IconButton size="small" onClick={handleDecrement} sx={{ p: 0.25 }} disabled={disabled}>
        <Remove fontSize="small" />
      </IconButton>
      <Typography sx={{ mx: 0.5, minWidth: 16, textAlign: 'center', fontWeight: 500, fontSize: 14, color: disabled ? '#bdbdbd' : undefined }}>
        {value || 0}
      </Typography>
      <IconButton size="small" onClick={handleIncrement} sx={{ p: 0.25 }} disabled={disabled}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
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
  editing: true, // new rows start in edit mode
});

const cloneWeeklyEntry = (entry) => ({
  ...entry,
  hours: Object.fromEntries(
    Object.entries(entry.hours || {}).map(([dayKey, dayValue]) => [dayKey, { ...dayValue }])
  ),
});

// Add getWeekRange function (copied from useTimeEntries.js)
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

function TimeEntries() {
  const { t, locale } = useTranslation();
  const daysOfWeek = dayKeys.map((key) => ({ key, label: t(`timeEntries.weekdays.${key}`) }));
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedUser, setSelectedUser] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editWeekEntry, setEditWeekEntry] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [weeklyProjects, setWeeklyProjects] = useState([]);
  const [projectSearchByEntry, setProjectSearchByEntry] = useState({});
  const [allWeeks, setAllWeeks] = useState([]); // [{start, end, loggedHours, isCurrent, isSelected, isComplete}]
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [carouselRef, setCarouselRef] = useState(null);
  const { user: currentUser, refreshSessionStatus } = useAuth();

  const { projects: weeklyProjectsFromHook } = useTimeEntries({
    userId: selectedUser,
    weekStart,
  });
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setSelectedUser(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && users.length > 0 && !selectedUser) {
      setSelectedUser(currentUser.id);
    }
  // selectedUser is intentionally omitted to avoid resetting a manual admin selection.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, users]);

  useEffect(() => {
    if (selectedUser) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY(selectedUser));
      if (saved) {
        // Handle loading saved entries
      } else {
        // Handle creating initial entries
      }
    }
    // eslint-disable-next-line
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(LOCAL_STORAGE_KEY(selectedUser), JSON.stringify(weeklyProjectsFromHook));
    }
    // eslint-disable-next-line
  }, [weeklyProjectsFromHook, selectedUser]);

  useEffect(() => {
    if (selectedUser && weekStart) {
      refreshWeeklyProjects();
    }
  // refreshWeeklyProjects is intentionally excluded because the function is recreated on render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser, weekStart]);

  useEffect(() => {
    if (weeklyProjects.length === 0) {
      setWeeklyProjects([initialEntry(selectedUser)]);
    }
    // eslint-disable-next-line
  }, [weeklyProjects, selectedUser]);

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
    try {
      const response = await axios.get('/api/time-entries');
      console.log('Fetched time entries:', response.data);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError(t('timeEntries.errors.fetchEntries')); 
    }
  }, [t]);

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
      setError(t('timeEntries.errors.fetchProjects'));
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/users');
      console.log('Fetched users:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(t('timeEntries.errors.fetchUsers'));
    }
  }, [t]);

  useEffect(() => {
    fetchTimeEntries();
    fetchProjects();
    fetchUsers();
  }, [fetchTimeEntries, fetchProjects, fetchUsers]);

  const dayTotals = daysOfWeek.map(day =>
    weeklyProjects.reduce((sum, entry) => sum + (parseFloat(entry.hours[day.key]?.value) || 0), 0)
  );
  const projectTotals = weeklyProjects.map(entry =>
    daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]?.value) || 0), 0)
  );
  const requiredHoursTotal = Object.values(requiredHoursPerDay).reduce((a, b) => a + b, 0);

  const refreshWeeklyProjects = async () => {
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
            editing: false,
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
      setWeeklyProjects(projectsArr);
    } catch (err) {
      setError(t('timeEntries.errors.refreshWeeklyProjects')); 
    }
  };

  const handleWeeklySubmit = async () => {
    setError(null);
    if (!selectedUser) {
      setError(t('timeEntries.validation.selectUserBeforeSubmit')); 
      return;
    }
    if (weeklyProjects.length === 0) {
      setError(t('timeEntries.validation.addOneProject')); 
      return;
    }
    // Validate: no duplicate projects, no all-zero rows, hours in 0-24
    const seen = new Set();
    for (const entry of weeklyProjects) {
      if (!entry.project_id) {
        setError(t('timeEntries.validation.projectForEachRow')); 
        return;
      }
      const key = `${selectedUser}|${entry.project_id}|${weekStart.toISOString()}`;
      if (seen.has(key)) {
        setError(t('timeEntries.validation.noDuplicateProjects')); 
        return;
      }
      seen.add(key);
      const totalHours = daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]?.value === '' || entry.hours[day.key]?.value === undefined ? 0 : entry.hours[day.key]?.value) || 0), 0);
      if (totalHours === 0) {
        setError(t('timeEntries.validation.nonZeroWeek')); 
        return;
      }
      for (const day of daysOfWeek) {
        const val = entry.hours[day.key]?.value;
        const num = val === '' || val === undefined ? 0 : parseFloat(val);
        if (isNaN(num) || num < 0 || num > 24) {
          setError(t('timeEntries.validation.invalidHours', { day: day.label }));
          return;
        }
      }
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
    try {
      if (updateRequests.length > 0) {
        await Promise.all(updateRequests);
      }
      if (batchEntries.length > 0) {
        await axios.post('/api/time-entries/batch', { entries: batchEntries });
      }
      if (deleteRequests.length > 0) {
        await Promise.all(deleteRequests);
      }
      // Update table with backend data and lock rows
      // Save order to localStorage (in case new projects were added)
      setSavedProjectOrder(selectedUser, weekStart, weeklyProjects);
      await fetchTimeEntries();
      await refreshWeeklyProjects();
      refreshSessionStatus().catch(() => {});
      setWeeklyProjects(prev => prev.map(row => ({
        ...row,
        original_project_id: row.project_id,
        editSnapshot: undefined,
        submitted: true,
        editing: false
      })));
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'timeEntries.errors.submit')); 
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
                await axios.patch(`/api/time-entries/${dayEntry.id}`, {
                  project_id: editWeekEntry.project_id,
                  date: date.toISOString(),
                  hours: {
                    ...dayEntry.hours,
                    [day.key]: hours,
                  },
                });
                return null;
              } else {
                await axios.post('/api/time-entries', {
                  project_id: editWeekEntry.project_id,
                  user_id: editWeekEntry.user_id,
                  date: date.toISOString(),
                  hours: {
                    ...dayEntry.hours,
                    [day.key]: hours,
                  },
                  description: '',
                });
                return null;
              }
            } else if (dayEntry) {
              await axios.delete(`/api/time-entries/${dayEntry.id}`);
              return null;
            } else {
              // No entry and no hours, nothing to do, treat as success
              return null;
            }
          } catch (err) {
            // If deleting and error is 404, treat as success
            if (err?.response?.status === 404) {
              return null;
            }
            return day.label;
          }
        })
      );
      const failedDays = results.filter(Boolean);
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
      refreshSessionStatus().catch(() => {});
      setConfirmDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      setError(t('timeEntries.errors.deleteEntries')); 
      setConfirmDialogOpen(false);
      setEntryToDelete(null);
    }
  };

  // Calculate total logged hours for the week
  const totalLogged = dayTotals.reduce((a, b) => a + b, 0);

  useEffect(() => {
    console.log('Weekly projects from hook:', weeklyProjectsFromHook);
  }, [weeklyProjectsFromHook]);

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
      refreshSessionStatus().catch(() => {});
    } catch (err) {
      console.error('Error deleting project entries:', err);
      setError(getApiErrorMessage(err, t, 'timeEntries.errors.deleteProjectEntries')); 
    }
  };

  // Enter edit mode for a specific row
  const handleEditRow = idx => {
    setWeeklyProjects(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        original_project_id: updated[idx].original_project_id || updated[idx].project_id,
        editSnapshot: cloneWeeklyEntry(updated[idx]),
        editing: true
      };
      return updated;
    });
  };

  // Save changes for rows in edit mode
  const handleSaveRow = async () => {
    await handleWeeklySubmit();
  };

  // Carousel scroll handlers
  const scrollCarousel = dir => {
    if (carouselRef) {
      const scrollAmount = 160; // px, adjust as needed
      carouselRef.scrollBy({ left: dir * scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCancelEditRow = idx => {
    setWeeklyProjects(prev => {
      const updated = [...prev];
      // If the row was just added and not yet submitted, remove it
      if (!updated[idx].submitted) {
        updated.splice(idx, 1);
      } else {
        const snapshot = updated[idx].editSnapshot;
        updated[idx] = snapshot
          ? { ...snapshot, editing: false, editSnapshot: undefined }
          : { ...updated[idx], editing: false, editSnapshot: undefined };
      }
      setSavedProjectOrder(selectedUser, weekStart, updated);
      return updated;
    });
    setProjectSearchByEntry((current) => ({
      ...current,
      [weeklyProjects[idx]?.id]: '',
    }));
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

  return (
    <PageLayout
      title={t('timeEntries.title')}
      subtitle={`${totalLogged}/${requiredHoursTotal} ${locale === 'ru' ? 'часов за выбранную неделю' : 'hours this week'}`}
      headerCenter={<WeekSelector weekStart={weekStart} onChange={setWeekStart} />}
      actions={
        currentUser?.role === 'admin' ? (
          <TextField
            select
            size="small"
            label={t('timeEntries.user')}
            value={selectedUser}
            onChange={e => {
              setSelectedUser(e.target.value);
            }}
            sx={{
              width: { xs: '100%', sm: 250 },
              minWidth: { xs: '100%', sm: 250 },
              maxWidth: { xs: '100%', sm: 250 },
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#5673DC' },
              '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#5673DC' },
              '& .MuiSelect-select': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                minWidth: 0,
                pr: 3,
              },
            }}
          >
            {users.map(user => {
              const displayName = `${user.surname} ${user.name}`;
              return (
                <MenuItem key={user.id} value={user.id}>
                  <span
                    style={{
                      display: 'inline-block',
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      verticalAlign: 'middle',
                    }}
                    title={displayName + (user.deleted ? ` (${t('timeEntries.deletedTag')})` : '')}
                  >
                    {displayName}
                    {user.deleted ? (
                      <span style={{ color: '#bdbdbd', fontStyle: 'italic', marginLeft: 6 }}>({t('timeEntries.deletedTag')})</span>
                    ) : null}
                  </span>
                </MenuItem>
              );
            })}
          </TextField>
        ) : null
      }
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
                onSelectWeek={dateStr => setWeekStart(getMonday(new Date(dateStr)))}
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
    >
      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: '1' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ height: 40, minHeight: 40 }}>
              <TableCell align="center" sx={{ width: 40, fontWeight: 'bold', p: 0, pt: 1 }}></TableCell>
              <TableCell align="left" sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold', p: 0, pt: 1 }}></TableCell>
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
              <TableCell align="center" sx={{ width: 60, minWidth: 40, maxWidth: 80, px: 0.25, py: 0,
                fontWeight: totalLogged < requiredHoursTotal ? 'normal' : 'bold',
                fontSize: 18,
                color: totalLogged < requiredHoursTotal ? 'black' : (totalLogged === requiredHoursTotal ? '#5673DC' : 'red')
              }}>
                {totalLogged}/{requiredHoursTotal}
              </TableCell>
              <TableCell align="center" sx={{ width: 80, fontWeight: 'bold', p: 0, pt: 1 }}></TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="center" sx={{ width: 40, fontWeight: 'bold' }}>#</TableCell>
              <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold', p: 1, pt: 1 }}>{t('timeEntries.project')}</TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 63, maxWidth: 73, width: 67, px: 0.5, py: 0.5, fontWeight: 'normal', fontSize: 13 }}>
                  {format(new Date(weekStart.getTime() + i * 86400000), 'dd.MM', { locale: ru })}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: 60, minWidth: 40, maxWidth: 80 }}>{t('timeEntries.total')}</TableCell>
              <TableCell align="center" sx={{ width: 80, fontWeight: 'bold' }}>{t('timeEntries.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyProjects.map((entry, idx) => (
              <TableRow key={entry.id}>
                <TableCell align="center" sx={{ width: 40, fontWeight: 'bold' }}>{idx + 1}</TableCell>
                <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, p: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                    <Box sx={{ flex: 1, pr: 1 }}>
                      {entry.editing ? (
                        <TextField
                          select
                          size="small"
                          value={entry.project_id}
                          displayEmpty
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
                          }}
                          sx={{
                            width: 530,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            '& .MuiOutlinedInput-root': {
                              fontSize: 11,
                              borderRadius: '12px',
                              backgroundColor: '#FFFFFF',
                            },
                            '& .MuiSelect-select': {
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: 13,
                              color: '#273041',
                            },
                          }}
                          SelectProps={{
                            onOpen: () => {},
                            onClose: () => {
                              setProjectSearchByEntry((current) => ({
                                ...current,
                                [entry.id]: '',
                              }));
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
                                  width: 530,
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
                                      maxWidth: 460,
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
                                      maxWidth: 460,
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
                {daysOfWeek.map(day => (
                  <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 63, maxWidth: 73, width: 67, px: 0.5, py: 0.5 }}>
                    <HourInput
                      value={entry.hours[day.key]?.value || ''}
                      onChange={val => handleHourChange(idx, day.key, val)}
                      disabled={!entry.editing}
                    />
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', width: 60, minWidth: 40, maxWidth: 80 }}>{projectTotals[idx]}</TableCell>
                <TableCell align="center" sx={{ width: 80 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    {!entry.editing ? (
                      <>
                        <IconButton size="small" onClick={() => handleDeleteProject(idx)}>
                          <Delete fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleEditRow(idx)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton size="small" onClick={handleSaveRow}>
                          <SaveIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleCancelEditRow(idx)}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
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
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', justifyContent: 'left', my: 2 }}>
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
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
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
        open={confirmDialogOpen}
        title={t('timeEntries.deleteTitle')}
        content={entryToDelete ? t('timeEntries.deleteConfirm', { project: entryToDelete.project_name, date: entryToDelete.date ? format(new Date(entryToDelete.date), 'PP', { locale: ru }) : '' }) : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDialogOpen(false); setEntryToDelete(null); }}
        confirmLabel={t('common.actions.delete')}
        cancelLabel={t('common.actions.cancel')}
      />
    </PageLayout>
  );
}

export default TimeEntries; 
