import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
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
import axios from 'axios';
import { Add, Delete, Remove, Edit as EditIcon, Save as SaveIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import TimeEntryForm from '../components/TimeEntryForm';
import SingleProjectWeekEditor from '../components/SingleProjectWeekEditor';
import DayHourBar from '../components/DayHourBar';
import useTimeEntries from '../hooks/useTimeEntries';
import WeekSelector from '../components/WeekSelector';
import ConfirmationDialog from '../components/ConfirmationDialog';
import WeekCarousel from '../components/WeekCarousel';
import { useAuth } from '../context/AuthContext';

const daysOfWeek = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' },
];
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

// Helper to format project display
const getProjectDisplay = (project) => {
  if (!project) return '';
  return project.code ? `${project.code} - ${project.name}` : project.name;
};

function TimeEntries() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [newEntry, setNewEntry] = useState({
    project_id: '',
    user_id: '',
    date: '',
    hours: '',
    description: '',
  });
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedUser, setSelectedUser] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editWeekEntry, setEditWeekEntry] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState(null);
  const [weeklyProjects, setWeeklyProjects] = useState([]);
  const [allWeeks, setAllWeeks] = useState([]); // [{start, end, loggedHours, isCurrent, isSelected, isComplete}]
  const [weeksToShow, setWeeksToShow] = useState(4);
  const [carouselRef, setCarouselRef] = useState(null);
  const { user: currentUser } = useAuth();

  const { projects: weeklyProjectsFromHook, loading: entriesLoading, error: entriesError } = useTimeEntries({
    userId: selectedUser,
    weekStart,
  });

  useEffect(() => {
    fetchTimeEntries();
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      setSelectedUser(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && users.length > 0 && !selectedUser) {
      setSelectedUser(currentUser.id);
    }
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

  const fetchTimeEntries = async () => {
    try {
      const response = await axios.get('/api/time-entries');
      console.log('Fetched time entries:', response.data);
      setTimeEntries(response.data);
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Failed to fetch time entries. Please try again.');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      console.log('Fetched projects:', response.data);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError('Failed to fetch projects. Please try again.');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      console.log('Fetched users:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users. Please try again.');
    }
  };

  const handleOpen = () => {
    setError(null);
    setOpen(true);
  };

  const handleClose = () => {
    setError(null);
    setOpen(false);
  };

  const handleSubmit = async () => {
    try {
      if (!newEntry.project_id) {
        setError('Please select a project');
        return;
      }

      if (!newEntry.user_id) {
        setError('Please select a user');
        return;
      }

      if (!newEntry.date) {
        setError('Date is required');
        return;
      }

      if (!newEntry.hours) {
        setError('Hours are required');
        return;
      }

      console.log('Submitting new time entry:', newEntry);
      const response = await axios.post('/api/time-entries', newEntry);
      console.log('Time entry created:', response.data);
      
      fetchTimeEntries();
      handleClose();
      setNewEntry({
        project_id: '',
        user_id: '',
        date: '',
        hours: '',
        description: '',
      });
    } catch (error) {
      console.error('Error creating time entry:', error);
      setError(error.response?.data?.error || 'Failed to create time entry. Please try again.');
    }
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMilliseconds = end - start;
    const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

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
      setError('Failed to refresh weekly projects.');
    }
  };

  const handleWeeklySubmit = async () => {
    setError(null);
    if (!selectedUser) {
      setError('Please select a user before submitting.');
      return;
    }
    if (weeklyProjects.length === 0) {
      setError('Please add at least one project.');
      return;
    }
    // Validate: no duplicate projects, no all-zero rows, hours in 0-24
    const seen = new Set();
    for (const entry of weeklyProjects) {
      if (!entry.project_id) {
        setError('Please select a project for each row.');
        return;
      }
      const key = `${selectedUser}|${entry.project_id}|${weekStart.toISOString()}`;
      if (seen.has(key)) {
        setError('Duplicate projects are not allowed for the same week.');
        return;
      }
      seen.add(key);
      const totalHours = daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]?.value === '' || entry.hours[day.key]?.value === undefined ? 0 : entry.hours[day.key]?.value) || 0), 0);
      if (totalHours === 0) {
        setError('Cannot submit a project with all days at 0 hours.');
        return;
      }
      for (const day of daysOfWeek) {
        const val = entry.hours[day.key]?.value;
        const num = val === '' || val === undefined ? 0 : parseFloat(val);
        if (isNaN(num) || num < 0 || num > 24) {
          setError(`Invalid hours for ${day.label} (must be 0-24).`);
          return;
        }
      }
    }
    // Prepare batch payload and collect zero-hour deletes
    const batchEntries = [];
    const deleteRequests = [];
    weeklyProjects.forEach(entry => {
      daysOfWeek.forEach((day, i) => {
        const val = entry.hours[day.key]?.value;
        const num = val === '' || val === undefined ? 0 : parseFloat(val);
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        // Use local YYYY-MM-DD
        const isoDate = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0');
        if (num > 0) {
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
      if (batchEntries.length > 0) {
        await axios.post('/api/time-entries/batch', { entries: batchEntries });
      }
      if (deleteRequests.length > 0) {
        await Promise.all(deleteRequests);
      }
      // Update table with backend data and lock rows
      // Save order to localStorage (in case new projects were added)
      const orderKey = getOrderStorageKey(selectedUser, weekStart);
      const order = weeklyProjects.map(e => e.project_id).filter(Boolean);
      localStorage.setItem(orderKey, JSON.stringify(order));
      await fetchTimeEntries();
      await refreshWeeklyProjects();
      setWeeklyProjects(prev => prev.map(row => ({ ...row, submitted: true, editing: false })));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit time entries.');
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
        setEditError('Failed to update entry.');
      } else if (failedDays.length > 0) {
        setEditError('Some days failed to update: ' + failedDays.join(', '));
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

  const handleDeleteEntry = (entry) => {
    setEntryToDelete(entry);
    setConfirmDialogOpen(true);
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
      setConfirmDialogOpen(false);
      setEntryToDelete(null);
    } catch (error) {
      setError('Failed to delete time entries. Please try again.');
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
            throw new Error('Missing user for deletion');
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
    } catch (err) {
      console.error('Error deleting project entries:', err);
      setError(err.response?.data?.error || err.message || 'Failed to delete project entries. Please try again.');
    }
  };

  // Enter edit mode for a specific row
  const handleEditRow = idx => {
    setWeeklyProjects(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], editing: true };
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
        updated[idx] = { ...updated[idx], editing: false };
      }
      return updated;
    });
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 2,
          gap: 2,
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: { xs: 'center', sm: 'flex-start' },
        }}
      >
        <Typography variant="h4" sx={{ mb: { xs: 1, sm: 0 } }}>Time Entries</Typography>
        {currentUser?.role === 'admin' && (
          <TextField
            select
            size="small"
            label="User"
            value={selectedUser}
            onChange={e => {
              setSelectedUser(e.target.value);
            }}
            sx={{
              width: 250,
              minWidth: 250,
              maxWidth: 250,
              ml: 2,
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
                    title={displayName + (user.deleted ? ' (deleted)' : '')}
                  >
                    {displayName}
                    {user.deleted ? (
                      <span style={{ color: '#bdbdbd', fontStyle: 'italic', marginLeft: 6 }}>(deleted)</span>
                    ) : null}
                  </span>
                </MenuItem>
              );
            })}
          </TextField>
        )}
        <Box sx={{ ml: { xs: 0, sm: 2 }, mt: { xs: 1, sm: 0 } }}>
          <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: '100vw', height: 64, borderRadius: '12px', border: '1px solid #E2E4E9', boxShadow: '1', background: '#f5f5f5', px: 2, py: 1, mb: 2 }}>
        <Button
          variant="outlined"
          size="small"
          sx={{
            mr: 2,
            minWidth: 130,
            height: 44,
            borderRadius: '8px',
            px: 2,
            py: 0.8,
            fontSize: 16,
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
          + Earlier Weeks
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
          />
        </Box>
      </Box>
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
              <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold', p: 1, pt: 1 }}>Project</TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 63, maxWidth: 73, width: 67, px: 0.5, py: 0.5, fontWeight: 'normal', fontSize: 13 }}>
                  {format(new Date(weekStart.getTime() + i * 86400000), 'dd.MM')}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: 60, minWidth: 40, maxWidth: 80 }}>Total</TableCell>
              <TableCell align="center" sx={{ width: 80, fontWeight: 'bold' }}>Actions</TableCell>
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
                              // Save new order to localStorage
                              const orderKey = getOrderStorageKey(selectedUser, weekStart);
                              const order = updated.map(e => e.project_id).filter(Boolean);
                              localStorage.setItem(orderKey, JSON.stringify(order));
                              return updated;
                            });
                          }}
                          sx={{
                            width: 530,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: 11,
                            '& .MuiOutlinedInput-root': { fontSize: 11 },
                          }}
                          SelectProps={{
                            MenuProps: {
                              PaperProps: {
                                sx: {
                                  fontSize: 11,
                                },
                              },
                            },
                          }}
                        >
                          <MenuItem value="" disabled>Select Project</MenuItem>
                          {projects
                            .filter(project => project.active !== 0)
                            .filter(project =>
                              // Only show projects not already selected in other rows, or the current row's project
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
                                  title={getProjectDisplay(project)}
                                >
                                  {getProjectDisplay(project)}
                                </span>
                              </MenuItem>
                            ))}
                        </TextField>
                      ) : (
                        <Tooltip title={getProjectDisplay(projects.find(p => p.id === entry.project_id)) || entry.project_name} placement="top" arrow>
                          <span style={{
                            display: 'inline-block',
                            maxWidth: 530,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            verticalAlign: 'middle',
                          }}>
                            {getProjectDisplay(projects.find(p => p.id === entry.project_id)) || entry.project_name}
                          </span>
                        </Tooltip>
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
                  Add Project
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
          Submit Week
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add Time Entry</DialogTitle>
        <TimeEntryForm
          entry={newEntry}
          projects={projects}
          users={users}
          error={error}
          onChange={setNewEntry}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          submitLabel="Add Entry"
        />
      </Dialog>

      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="lg" fullWidth>
        <DialogTitle>Edit Time Entry</DialogTitle>
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
        title="Delete Time Entries"
        content={entryToDelete ? `Are you sure you want to delete all time entries for ${entryToDelete.project_name} from ${entryToDelete.date ? format(new Date(entryToDelete.date), 'PP') : ''}?` : ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => { setConfirmDialogOpen(false); setEntryToDelete(null); }}
        confirmLabel="Delete"
        cancelLabel="Cancel"
      />
    </Box>
  );
}

export default TimeEntries; 