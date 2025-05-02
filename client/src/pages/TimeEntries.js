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
  IconButton
} from '@mui/material';
import { format } from 'date-fns';
import axios from 'axios';
import { Add, Delete, Remove, Edit as EditIcon } from '@mui/icons-material';
import TimeEntryForm from '../components/TimeEntryForm';
import SingleProjectWeekEditor from '../components/SingleProjectWeekEditor';
import DayHourBar from '../components/DayHourBar';

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
});

function TimeEntries() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [newEntry, setNewEntry] = useState({
    project_id: '',
    user_id: '',
    start_time: '',
    end_time: '',
    description: '',
  });
  const [weeklyEntries, setWeeklyEntries] = useState([
    {
      project_id: '',
      user_id: '',
      hours: { mon: '', tue: '', wed: '', thu: '', fri: '', sat: '', sun: '' },
    },
  ]);
  const [weekStart, setWeekStart] = useState(getMonday(new Date()));
  const [selectedUser, setSelectedUser] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editWeekEntry, setEditWeekEntry] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    fetchTimeEntries();
    fetchProjects();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0].id);
      setWeeklyEntries(weeklyEntries.map(entry => ({ ...entry, user_id: users[0].id })));
    }
    // eslint-disable-next-line
  }, [users]);

  useEffect(() => {
    if (selectedUser) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY(selectedUser));
      if (saved) {
        setWeeklyEntries(JSON.parse(saved));
      } else {
        setWeeklyEntries([initialEntry(selectedUser)]);
      }
    }
    // eslint-disable-next-line
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) {
      localStorage.setItem(LOCAL_STORAGE_KEY(selectedUser), JSON.stringify(weeklyEntries));
    }
    // eslint-disable-next-line
  }, [weeklyEntries, selectedUser]);

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

      if (!newEntry.start_time) {
        setError('Start time is required');
        return;
      }

      if (!newEntry.end_time) {
        setError('End time is required');
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
        start_time: '',
        end_time: '',
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

  const addProjectRow = () => {
    setWeeklyEntries([
      ...weeklyEntries,
      initialEntry(selectedUser),
    ]);
  };

  const removeProjectRow = (idx) => {
    setWeeklyEntries(weeklyEntries.filter((_, i) => i !== idx));
  };

  const handleWeeklyChange = (idx, field, value) => {
    const updated = [...weeklyEntries];
    updated[idx][field] = value;
    setWeeklyEntries(updated);
  };

  const handleHourChange = (idx, day, value) => {
    const updated = [...weeklyEntries];
    if (typeof value === 'string') {
      updated[idx].hours[day] = value.replace(/[^0-9.]/g, '');
    } else {
      updated[idx].hours[day] = value;
    }
    setWeeklyEntries(updated);
  };

  const dayTotals = daysOfWeek.map(day =>
    weeklyEntries.reduce((sum, entry) => sum + (parseFloat(entry.hours[day.key]) || 0), 0)
  );
  const projectTotals = weeklyEntries.map(entry =>
    daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]) || 0), 0)
  );
  const requiredHoursTotal = Object.values(requiredHoursPerDay).reduce((a, b) => a + b, 0);

  const handleWeeklySubmit = async () => {
    setError(null);
    let hasError = false;
    for (const entry of weeklyEntries) {
      if (!entry.project_id || !entry.user_id) {
        setError('Please select a project and user for each row.');
        hasError = true;
        break;
      }
    }
    if (hasError) return;
    const submissionTime = new Date().toISOString();
    const promises = [];
    // Only submit entries that are not yet submitted
    weeklyEntries.forEach((entry, idx) => {
      if (entry.submitted) return;
      daysOfWeek.forEach((day, i) => {
        const hours = parseFloat(entry.hours[day.key]);
        if (hours && hours > 0) {
          const date = new Date(weekStart);
          date.setDate(date.getDate() + i);
          const start_time = new Date(date);
          start_time.setHours(9, 0, 0, 0);
          const end_time = new Date(start_time);
          end_time.setHours(start_time.getHours() + hours);
          promises.push(
            axios.post('/api/time-entries', {
              project_id: entry.project_id,
              user_id: entry.user_id,
              start_time: start_time.toISOString(),
              end_time: end_time.toISOString(),
              description: '',
              submission_time: submissionTime,
            })
          );
        }
      });
    });
    try {
      await Promise.all(promises);
      fetchTimeEntries();
      // Mark submitted entries as submitted and assign a new id to each new row
      setWeeklyEntries(weeklyEntries.map(entry =>
        entry.submitted ? entry : { ...entry, submitted: true, id: entry.id || uniqueId() }
      ));
    } catch (error) {
      setError('Failed to submit time entries.');
    }
  };

  // Group timeEntries by project_name and submission_time, filtered by selected user
  const filteredEntries = timeEntries.filter(e => !selectedUser || e.user_id === selectedUser);
  const groupedEntries = Object.values(
    filteredEntries.reduce((acc, entry) => {
      const key = `${entry.project_name}|${entry.submission_time}`;
      if (!acc[key]) {
        acc[key] = {
          project_name: entry.project_name,
          submission_time: entry.submission_time,
          total_hours: 0,
          hours: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 },
        };
      }
      // Find the day key for this entry
      const date = new Date(entry.start_time);
      const dayIdx = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Sun, 1=Mon...
      const dayKey = daysOfWeek[dayIdx].key;
      const hours = (new Date(entry.end_time) - new Date(entry.start_time)) / (1000 * 60 * 60);
      acc[key].hours[dayKey] = hours;
      acc[key].total_hours += hours;
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.submission_time) - new Date(a.submission_time));

  // In the log table, assign numbers so the most recent entry gets the largest number
  groupedEntries.forEach((entry, idx, arr) => entry.displayNumber = arr.length - idx);

  const handleEditOpen = (entry) => {
    // Find all entries for this project and submission_time
    const weekEntries = timeEntries.filter(e => e.project_name === entry.project_name && e.submission_time === entry.submission_time);
    // Build hours object for the week, always include all days
    const hours = {};
    daysOfWeek.forEach((day, idx) => {
      const dayEntry = weekEntries.find(e => {
        const date = new Date(e.start_time);
        const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
        return dayOfWeek === idx + 1;
      });
      hours[day.key] = dayEntry ? ((new Date(dayEntry.end_time) - new Date(dayEntry.start_time)) / (1000 * 60 * 60)).toString() : '0';
    });
    setEditWeekEntry({
      id: weekEntries[0]?.id,
      project_id: weekEntries[0]?.project_id || '',
      hours,
      submission_time: entry.submission_time,
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
          const date = new Date(editWeekEntry.submission_time);
          date.setDate(date.getDate() - date.getDay() + (i + 1));
          const dayEntry = timeEntries.find(e => {
            const entryDate = new Date(e.start_time);
            return (
              e.submission_time === editWeekEntry.submission_time &&
              e.project_name === groupedEntries.find(g => g.submission_time === editWeekEntry.submission_time && g.project_name === e.project_name)?.project_name &&
              entryDate.toDateString() === date.toDateString()
            );
          });
          try {
            if (hours && hours > 0) {
              if (dayEntry) {
                const start_time = new Date(date);
                start_time.setHours(9, 0, 0, 0);
                const end_time = new Date(start_time);
                end_time.setHours(start_time.getHours() + hours);
                await axios.patch(`/api/time-entries/${dayEntry.id}`, {
                  project_id: editWeekEntry.project_id,
                  start_time: start_time.toISOString(),
                  end_time: end_time.toISOString(),
                });
                return null;
              } else {
                const start_time = new Date(date);
                start_time.setHours(9, 0, 0, 0);
                const end_time = new Date(start_time);
                end_time.setHours(start_time.getHours() + hours);
                await axios.post('/api/time-entries', {
                  project_id: editWeekEntry.project_id,
                  user_id: editWeekEntry.user_id,
                  start_time: start_time.toISOString(),
                  end_time: end_time.toISOString(),
                  description: '',
                  submission_time: editWeekEntry.submission_time,
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
        // Update weeklyEntries for the edited project/user/week
        setWeeklyEntries(prev => {
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

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm(`Are you sure you want to delete all time entries for ${entry.project_name} from ${format(new Date(entry.submission_time), 'PP')}?`)) {
      return;
    }

    try {
      // Find all time entries for this project and submission time
      const entriesToDelete = timeEntries.filter(e => 
        e.project_name === entry.project_name && 
        e.submission_time === entry.submission_time
      );

      // Delete each entry
      await Promise.all(entriesToDelete.map(e => 
        axios.delete(`/api/time-entries/${e.id}`)
      ));

      // Refresh the time entries
      await fetchTimeEntries();

      // Update weeklyEntries to remove the deleted entries
      setWeeklyEntries(prev => {
        const updated = prev.filter(row => 
          !(row.project_id === entriesToDelete[0]?.project_id && 
            row.submitted)
        );
        if (selectedUser) {
          localStorage.setItem(LOCAL_STORAGE_KEY(selectedUser), JSON.stringify(updated));
        }
        return updated;
      });

    } catch (error) {
      console.error('Error deleting time entries:', error);
      setError('Failed to delete time entries. Please try again.');
    }
  };

  // Calculate total logged hours for the week
  const totalLogged = dayTotals.reduce((a, b) => a + b, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h4">Time Entries</Typography>
        <TextField
          select
          size="small"
          label="User"
          value={selectedUser}
          onChange={e => {
            setSelectedUser(e.target.value);
            setWeeklyEntries(weeklyEntries.map(entry => ({ ...entry, user_id: e.target.value })));
          }}
          sx={{ minWidth: 180, ml: 2 }}
        >
          {users.map(user => (
            <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
          ))}
        </TextField>
      </Box>
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ height: 40, minHeight: 40 }}>
              <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold', p: 0, pt: 1 }}></TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, fontWeight: 'bold', p: 0, pt: 1 }}>
                  <DayHourBar
                    hours={dayTotals[i]}
                    isWeekend={day.key === 'sat' || day.key === 'sun'}
                  />
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      marginTop: 2,
                      color: dayTotals[i] >= 8 ? '#1976d2' : undefined,
                      borderBottom: dayTotals[i] >= 8 ? '3px solid #1976d2' : undefined,
                      display: 'inline-block',
                      paddingBottom: 1,
                      transition: 'color 0.2s, border-bottom 0.2s',
                    }}
                  >
                    {day.label}
                  </div>
                </TableCell>
              ))}
              <TableCell align="center" sx={{ width: 1, minWidth: 1, px: 0.25, py: 0,
                fontWeight: totalLogged < requiredHoursTotal ? 'normal' : 'bold',
                fontSize: 18,
                color: totalLogged < requiredHoursTotal ? 'black' : (totalLogged === requiredHoursTotal ? '#1976d2' : 'red')
              }}>
                {totalLogged}/{requiredHoursTotal}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold' }}>Project</TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 56, px: 0.5, py: 0.5, fontWeight: 'normal', fontSize: 13 }}>
                  {format(new Date(weekStart.getTime() + i * 86400000), 'dd.MM')}
                </TableCell>
              ))}
              <TableCell align="center">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {weeklyEntries.map((entry, idx) => (
              <TableRow key={idx} sx={entry.submitted ? { color: '#bdbdbd' } : {}}>
                <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <TextField
                    select
                    size="small"
                    value={entry.project_id}
                    onChange={e => handleWeeklyChange(idx, 'project_id', e.target.value)}
                    fullWidth
                    disabled={entry.submitted}
                    InputProps={{ style: entry.submitted ? { color: '#bdbdbd' } : {}, ...{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      width: 550,
                      minWidth: 550,
                      maxWidth: 550
                    } }}
                  >
                    {projects.map(project => (
                      <MenuItem key={project.id} value={project.id} style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: 550,
                        minWidth: 550,
                        maxWidth: 550
                      }}>{project.name}</MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                {daysOfWeek.map(day => (
                  <TableCell key={day.key} align="center" sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 56, px: 0.5, py: 0.5 }}>
                    <HourInput
                      value={entry.hours[day.key]}
                      onChange={val => handleHourChange(idx, day.key, val)}
                      disabled={entry.submitted}
                      style={entry.submitted ? { color: '#bdbdbd' } : {}}
                    />
                  </TableCell>
                ))}
                <TableCell align="center" sx={{ fontWeight: 'bold', color: entry.submitted ? '#bdbdbd' : undefined }}>{projectTotals[idx]}</TableCell>
                <TableCell sx={{ width: 1, minWidth: 1, px: 0.25, py: 0 }}>
                  <IconButton onClick={() => removeProjectRow(idx)} disabled={weeklyEntries.length === 1 || entry.submitted} sx={{ p: 0.25 }}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={daysOfWeek.length + 3} sx={{ border: 'none', p: 1 }}>
                <Button
                  variant="text"
                  color="primary"
                  size="small"
                  startIcon={<Add />}
                  onClick={addProjectRow}
                  sx={{ mt: 1, fontWeight: 'normal', fontSize: 16, textTransform: 'none', pl: 0, minHeight: 'unset', minWidth: 'unset', p: 0 }}
                >
                  Add Project
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button variant="contained" color="primary" onClick={handleWeeklySubmit}>Submit Week</Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Time Log</Typography>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'bold' }}>Project</TableCell>
              <TableCell>Total Hours</TableCell>
              <TableCell>Submission Date/Time</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupedEntries.map((entry) => (
              <TableRow key={entry.project_name + entry.submission_time}>
                <TableCell>{entry.displayNumber}</TableCell>
                <TableCell sx={{ width: 550, minWidth: 550, maxWidth: 550, textAlign: 'left', fontWeight: 'normal', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.project_name}</TableCell>
                <TableCell>{entry.total_hours.toFixed(2)}</TableCell>
                <TableCell>{entry.submission_time ? format(new Date(entry.submission_time), 'yyyy-MM-dd, HH:mm') : ''}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => handleEditOpen(entry)} sx={{ mr: 1 }}>
                    Edit
                  </Button>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="error"
                    onClick={() => handleDeleteEntry(entry)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
          weekStart={getMonday(new Date(editWeekEntry?.submission_time || new Date()))}
          onChange={setEditWeekEntry}
          onSave={handleEditSave}
          onCancel={handleEditClose}
          error={editError}
          loading={editLoading}
        />
      </Dialog>
    </Box>
  );
}

export default TimeEntries; 