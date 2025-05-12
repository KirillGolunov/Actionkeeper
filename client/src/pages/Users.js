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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import Snackbar from '@mui/material/Snackbar';
import { useAuth } from '../context/AuthContext';

function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    surname: '',
    email: '',
    role: 'user',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOption, setDeleteOption] = useState('keep');
  const [filters, setFilters] = useState({ active: false, deleted: false, user: false, admin: false });
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserDraft, setEditUserDraft] = useState(null);
  const [addDraft, setAddDraft] = useState({ name: '', surname: '', email: '', role: 'user' });
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(null);
  const [resendError, setResendError] = useState(null);
  const [resendEmail, setResendEmail] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const { user: currentUser } = useAuth();

  const tagStyles = {
    active: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'Active',
    },
    deleted: {
      selected: { background: '#F5EAFE', color: '#A259E6', border: '1px solid #A259E6' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'Deleted',
    },
    user: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'User',
    },
    admin: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: 'Admin',
    },
  };

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, []);

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

  const fetchInvitations = async () => {
    try {
      const response = await axios.get('/api/invitations');
      setInvitations(response.data);
    } catch (error) {
      // Optionally handle error
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

  const handleSubmit = () => {
    if (!newUser.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!newUser.surname.trim()) {
      setError('Surname is required');
      return;
    }
    if (!newUser.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(newUser.email)) {
      setError('Please enter a valid email address');
      return;
    }
    setInviteDialogOpen(true);
  };

  const handleSendInvitation = async () => {
    setInviteLoading(true);
    setError(null);
    try {
      await axios.post('/api/invitations', {
        email: newUser.email,
        invited_by: null,
        name: newUser.name,
        surname: newUser.surname,
      });
      fetchUsers();
      fetchInvitations();
      setNewUser({ name: '', surname: '', email: '', role: 'user' });
      setAddDraft({ name: '', surname: '', email: '', role: 'user' });
      setInviteDialogOpen(false);
      setSnackbarMsg('Invitation sent successfully!');
      setSnackbarOpen(true);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to send invitation.');
    } finally {
      setInviteLoading(false);
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEditOpen = (user) => {
    setError(null);
    setEditUser(user);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setError(null);
    setEditOpen(false);
    setEditUser(null);
  };

  const handleEditSave = async () => {
    try {
      if (!editUser.name.trim()) {
        setError('Name is required');
        return;
      }
      if (!editUser.surname.trim()) {
        setError('Surname is required');
        return;
      }
      if (!editUser.email.trim()) {
        setError('Email is required');
        return;
      }
      if (!isValidEmail(editUser.email)) {
        setError('Please enter a valid email address');
        return;
      }
      await axios.patch(`/api/users/${editUser.id}`, editUser);
      fetchUsers();
      handleEditClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = (user) => {
    setUserToDelete(user);
    setDeleteOption('keep');
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async (deleteHours) => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      if (deleteHours) {
        // Delete user and all their time entries
        await axios.delete(`/api/users/${userToDelete.id}/full`);
      } else {
        // Delete user only (keep logged hours)
        await axios.delete(`/api/users/${userToDelete.id}`);
      }
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteLoading(false);
      fetchUsers();
    } catch (error) {
      setError('Failed to delete user and/or their time entries.');
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (filters.active && user.deleted) return false;
    if (filters.deleted && !user.deleted) return false;
    if (filters.user && user.role !== 'user') return false;
    if (filters.admin && user.role !== 'admin') return false;
    return true;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const handleAddUser = () => {
    if (!addDraft.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!addDraft.surname.trim()) {
      setError('Surname is required');
      return;
    }
    if (!addDraft.email.trim()) {
      setError('Email is required');
      return;
    }
    if (!isValidEmail(addDraft.email)) {
      setError('Please enter a valid email address');
      return;
    }
    // Set newUser to addDraft and open the invite modal
    setNewUser({ ...addDraft });
    setInviteDialogOpen(true);
  };

  const handleEditClick = (user) => {
    setEditingUserId(user.id);
    setEditUserDraft({ ...user });
    setError(null);
  };

  const handleEditCancel = () => {
    setEditingUserId(null);
    setEditUserDraft(null);
    setError(null);
  };

  const handleEditSaveInline = async () => {
    try {
      if (!editUserDraft.name.trim() || !editUserDraft.surname.trim() || !editUserDraft.email.trim()) {
        setError('All fields are required');
        return;
      }
      if (!isValidEmail(editUserDraft.email)) {
        setError('Please enter a valid email address');
        return;
      }
      await axios.patch(`/api/users/${editUserDraft.id}`, editUserDraft);
      fetchUsers();
      setEditingUserId(null);
      setEditUserDraft(null);
      setError(null);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update user. Please try again.');
    }
  };

  // Helper: check if user is invited
  const getInvitation = (email) => invitations.find(inv => inv.email === email && inv.accepted === 0);

  // Resend invitation logic
  const handleResendClick = (email) => {
    setResendEmail(email);
    setResendDialogOpen(true);
    setResendSuccess(null);
    setResendError(null);
  };
  const handleResendConfirm = async () => {
    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);
    try {
      await axios.post('/api/invitations', { email: resendEmail, invited_by: null });
      fetchInvitations();
      setSnackbarMsg('Invitation resent successfully!');
      setSnackbarOpen(true);
      setTimeout(() => setResendDialogOpen(false), 1200);
    } catch (error) {
      setResendError(error.response?.data?.error || 'Failed to resend invitation.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">Users</Typography>
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {Object.keys(tagStyles).map((key) => (
              <Chip
                key={key}
                label={tagStyles[key].label}
                clickable
                onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                sx={{
                  fontSize: '12px',
                  height: '24px',
                  borderRadius: '6px',
                  px: 1.5,
                  fontWeight: 400,
                  boxShadow: 'none',
                  ...((filters[key]) ? tagStyles[key].selected : tagStyles[key].default),
                }}
              />
            ))}
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: '1' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ height: 40, minHeight: 40 }}>
              <TableCell sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 300, maxWidth: 300, minWidth: 220 }}>Surname</TableCell>
              <TableCell sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 260, maxWidth: 260, minWidth: 180 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 120, maxWidth: 120 }}>Status</TableCell>
              {currentUser?.role === 'admin' && (
                <TableCell align="right" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1 }}>Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentUser?.role === 'admin' && (
              <TableRow>
                <TableCell sx={{ px: 2, py: 1, width: 300, maxWidth: 300, minWidth: 220 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Surname"
                    value={addDraft.surname}
                    onChange={e => setAddDraft(d => ({ ...d, surname: e.target.value }))}
                    sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                  />
                </TableCell>
                <TableCell sx={{ px: 2, py: 1, width: 260, maxWidth: 260, minWidth: 180 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Name"
                    value={addDraft.name}
                    onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                    sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                  />
                </TableCell>
                <TableCell sx={{ px: 2, py: 1 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Email"
                    value={addDraft.email}
                    onChange={e => setAddDraft(d => ({ ...d, email: e.target.value }))}
                    sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                  />
                </TableCell>
                <TableCell sx={{ px: 2, py: 1 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={addDraft.role}
                    onChange={e => setAddDraft(d => ({ ...d, role: e.target.value }))}
                    sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                  >
                    <MenuItem value="user">User</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell sx={{ px: 2, py: 1, width: 120, maxWidth: 120 }}></TableCell>
                <TableCell align="right" sx={{ px: 2, py: 1 }}>
                  <Button size="small" variant="contained" onClick={handleAddUser}
                    sx={{
                      minWidth: 70,
                      height: 32,
                      borderRadius: 2,
                      fontWeight: 500,
                      fontSize: 12,
                      textTransform: 'none',
                      px: 1.2,
                      backgroundColor: '#8196E4',
                      color: '#FFFFFF',
                      boxShadow: 3,
                      '&:hover': { backgroundColor: '#4A69D9' },
                    }}
                  >
                    Add
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {sortedUsers.map((user) => {
              const isEditing = editingUserId === user.id;
              return (
                <TableRow key={user.id} sx={user.deleted ? { color: '#bdbdbd', '& td': { color: '#bdbdbd' } } : {}}>
                  <TableCell sx={{ px: 2, py: 1, width: 300, maxWidth: 300, minWidth: 220 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.surname}
                        onChange={e => setEditUserDraft(d => ({ ...d, surname: e.target.value }))}
                        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                      />
                    ) : (
                      <Tooltip title={user.surname} placement="top" arrow>
                        <span style={{ display: 'inline-block', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{user.surname}</span>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1, width: 260, maxWidth: 260, minWidth: 180 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.name}
                        onChange={e => setEditUserDraft(d => ({ ...d, name: e.target.value }))}
                        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                      />
                    ) : (
                      <Tooltip title={user.name} placement="top" arrow>
                        <span style={{ display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{user.name}</span>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.email}
                        onChange={e => setEditUserDraft(d => ({ ...d, email: e.target.value }))}
                        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                      />
                    ) : (
                      user.email
                    )}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={editUserDraft.role}
                        onChange={e => setEditUserDraft(d => ({ ...d, role: e.target.value }))}
                        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                      >
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                      </TextField>
                    ) : (
                      <Chip
                        label={user.role === 'admin' ? 'Admin' : 'User'}
                        size="small"
                        sx={user.deleted ? {
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '64px',
                          borderRadius: '6px',
                          px: 'none',
                          fontWeight: 400,
                          boxShadow: 'none',
                          background: '#F5F7FA',
                          color: '#bdbdbd',
                          border: '1px solid #bdbdbd',
                        } : (user.role === 'admin' ? {
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '64px',
                          borderRadius: '6px',
                          px: 'none',
                          fontWeight: 400,
                          boxShadow: 'none',
                          background: '#F5EAFE',
                          color: '#7C3A6A',
                          border: '1px solid #7C3A6A',
                        } : {
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '64px',
                          borderRadius: '6px',
                          px: 'none',
                          fontWeight: 400,
                          boxShadow: 'none',
                          background: '#E6F0F5',
                          color: '#3B6C74',
                          border: '1px solid #3B6C74',
                        })}
                      />
                    )}
                  </TableCell>
                  <TableCell sx={{ px: 2, py: 1, width: 120, maxWidth: 120 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={editUserDraft.deleted ? 'deleted' : 'active'}
                        onChange={e => setEditUserDraft(d => ({ ...d, deleted: e.target.value === 'deleted' ? 1 : 0 }))}
                        sx={{ background: '#f7f8fa', borderRadius: 2, '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: 2, background: '#f7f8fa' } }}
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="deleted">Deleted</MenuItem>
                      </TextField>
                    ) : (
                      user.deleted ? (
                        <Chip label="Deleted" size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#F5F7FA', color: '#bdbdbd', border: '1px solid #bdbdbd', fontWeight: 400 }} />
                      ) : user.invited ? (
                        <Chip label="Invited" size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#FFF8E1', color: '#B28704', border: '1px solid #FFD600', fontWeight: 400 }} />
                      ) : (
                        <Chip label="Active" size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC', fontWeight: 400 }} />
                      )
                    )}
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell align="right" sx={{ px: 2, py: 1 }}>
                      {isEditing ? (
                        <>
                          <Button size="small" variant="contained" onClick={handleEditSaveInline}
                            sx={{
                              minWidth: 70,
                              height: 32,
                              borderRadius: 2,
                              border: '1.5px solid #5673DC',
                              color: '#fff',
                              background: '#5673DC',
                              fontWeight: 500,
                              fontSize: 12,
                              textTransform: 'none',
                              px: 1.2,
                              py: 0,
                              boxShadow: 'none',
                              margin: 0,
                              '&:hover': { background: '#4A69D9', border: '1.5px solid #4A69D9' },
                            }}
                          >
                            Save
                          </Button>
                          <Button size="small" variant="contained" onClick={handleEditCancel}
                            startIcon={<CloseIcon />}
                            sx={{
                              minWidth: 70,
                              height: 32,
                              borderRadius: 2,
                              border: '1.5px solid #d32f2f',
                              color: '#d32f2f',
                              background: '#FFEAEA',
                              fontWeight: 500,
                              fontSize: 12,
                              textTransform: 'none',
                              px: 1.2,
                              py: 0,
                              boxShadow: 'none',
                              margin: 0,
                              ml: 1,
                              '&:hover': { background: '#ffd6d6', border: '1.5px solid #b71c1c', color: '#b71c1c' },
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          {user.invited === 1 && !user.deleted && (
                            <Tooltip title="Resend invitation">
                              <Button size="small" onClick={() => handleResendClick(user.email)} sx={{ minWidth: 36, color: '#fff', background: '#5673DC', borderRadius: 2, mr: 1, '&:hover': { background: '#4A69D9' } }}>
                                <AutorenewIcon fontSize="small" />
                              </Button>
                            </Tooltip>
                          )}
                          <Button size="small" variant="outlined" onClick={() => handleEditClick(user)}
                            sx={{
                              minWidth: 70,
                              height: 32,
                              borderRadius: 2,
                              border: '1.5px solid #E2E4E9',
                              color: '#222',
                              background: '#f7f8fa',
                              fontWeight: 500,
                              fontSize: 12,
                              boxShadow: 'none',
                              textTransform: 'none',
                              px: 1.2,
                              '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
                            }}
                          >
                            Edit
                          </Button>
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteUser(user)}
                            sx={{
                              minWidth: 70,
                              height: 32,
                              borderRadius: 2,
                              border: '1.5px solid #E2E4E9',
                              color: '#d32f2f',
                              background: '#f7f8fa',
                              fontWeight: 500,
                              fontSize: 12,
                              boxShadow: 'none',
                              textTransform: 'none',
                              px: 1.2,
                              ml: 1,
                              '&:hover': { background: 'rgba(211,47,47,0.10)', border: '1.5px solid #d32f2f', color: '#d32f2f' },
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            error={!!error && !newUser.name.trim()}
            helperText={!newUser.name.trim() ? 'Name is required' : ''}
          />
          <TextField
            margin="dense"
            label="Surname"
            fullWidth
            value={newUser.surname}
            onChange={(e) => setNewUser({ ...newUser, surname: e.target.value })}
            error={!!error && !newUser.surname.trim()}
            helperText={!newUser.surname.trim() ? 'Surname is required' : ''}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            error={!!error && (!newUser.email.trim() || !isValidEmail(newUser.email))}
            helperText={
              !newUser.email.trim()
                ? 'Email is required'
                : !isValidEmail(newUser.email)
                ? 'Please enter a valid email address'
                : ''
            }
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Role"
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}
            variant="outlined"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              border: '1.5px solid #E2E4E9',
              color: '#222',
              background: '#f7f8fa',
              fontWeight: 500,
              fontSize: 12,
              boxShadow: 'none',
              textTransform: 'none',
              px: 1.2,
              '&:hover': {
                background: 'rgba(86,115,220,0.10)',
                border: '1.5px solid #5673DC',
                color: '#5673DC',
              },
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              fontWeight: 500,
              fontSize: 12,
              textTransform: 'none',
              px: 1.2,
              backgroundColor: '#8196E4',
              color: '#FFFFFF',
              boxShadow: 3,
              '&:hover': {
                backgroundColor: '#4A69D9',
              },
            }}
          >
            Add User
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={editUser?.name || ''}
            onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
            error={!!error && !editUser?.name?.trim()}
            helperText={!editUser?.name?.trim() ? 'Name is required' : ''}
          />
          <TextField
            margin="dense"
            label="Surname"
            fullWidth
            value={editUser?.surname || ''}
            onChange={(e) => setEditUser({ ...editUser, surname: e.target.value })}
            error={!!error && !editUser?.surname?.trim()}
            helperText={!editUser?.surname?.trim() ? 'Surname is required' : ''}
          />
          <TextField
            margin="dense"
            label="Email"
            type="email"
            fullWidth
            value={editUser?.email || ''}
            onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
            error={!!error && (!editUser?.email?.trim() || !isValidEmail(editUser?.email))}
            helperText={
              !editUser?.email?.trim()
                ? 'Email is required'
                : !isValidEmail(editUser?.email)
                ? 'Please enter a valid email address'
                : ''
            }
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Role"
            value={editUser?.role || 'user'}
            onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
          >
            <MenuItem value="user">User</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}
            variant="outlined"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              border: '1.5px solid #E2E4E9',
              color: '#222',
              background: '#f7f8fa',
              fontWeight: 500,
              fontSize: 12,
              boxShadow: 'none',
              textTransform: 'none',
              px: 1.2,
              '&:hover': {
                background: 'rgba(86,115,220,0.10)',
                border: '1.5px solid #5673DC',
                color: '#5673DC',
              },
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleEditSave} variant="contained" color="primary"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              fontWeight: 500,
              fontSize: 12,
              textTransform: 'none',
              px: 1.2,
              backgroundColor: '#8196E4',
              color: '#FFFFFF',
              boxShadow: 3,
              '&:hover': {
                backgroundColor: '#4A69D9',
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete the user "{userToDelete?.surname} {userToDelete?.name}"?</Typography>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">What should happen to this user's logged hours?</FormLabel>
            <RadioGroup
              value={deleteOption}
              onChange={e => setDeleteOption(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="keep" control={<Radio />} label="Keep logged hours (delete user only)" />
              <FormControlLabel value="delete" control={<Radio />} label="Delete user and all logged hours" />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              border: '1.5px solid #E2E4E9',
              color: '#222',
              background: '#f7f8fa',
              fontWeight: 500,
              fontSize: 12,
              boxShadow: 'none',
              textTransform: 'none',
              px: 1.2,
              '&:hover': {
                background: 'rgba(86,115,220,0.10)',
                border: '1.5px solid #5673DC',
                color: '#5673DC',
              },
            }}
          >
            Cancel
          </Button>
          <Button onClick={() => confirmDeleteUser(deleteOption === 'delete')} color="error" variant="contained"
            sx={{
              minWidth: 70,
              height: 32,
              borderRadius: 2,
              fontWeight: 500,
              fontSize: 12,
              textTransform: 'none',
              px: 1.2,
              backgroundColor: '#d32f2f',
              color: '#fff',
              boxShadow: 3,
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
            }}
            disabled={deleteLoading}
          >
            {deleteLoading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, p: 0, minWidth: 380, background: '#F7F8FA' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#5673DC', fontSize: 20, pb: 0, pt: 2, px: 3, background: 'transparent' }}>Send Invitation</DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: 16, color: '#222', mb: 1.5 }}>
            Send invitation to <b>{newUser.email}</b>? The user will receive an email to join.
          </Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setInviteDialogOpen(false)} disabled={inviteLoading}
            sx={{
              minWidth: 80,
              height: 36,
              borderRadius: 2,
              border: '1.5px solid #E2E4E9',
              color: '#222',
              background: '#f7f8fa',
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              boxShadow: 'none',
              mr: 1,
              '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSendInvitation} variant="contained" disabled={inviteLoading}
            sx={{
              minWidth: 120,
              height: 36,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              backgroundColor: '#5673DC',
              color: '#fff',
              boxShadow: 3,
              '&:hover': { backgroundColor: '#4A69D9' },
            }}
          >
            {inviteLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resendDialogOpen} onClose={() => setResendDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3, p: 0, minWidth: 380, background: '#F7F8FA' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#5673DC', fontSize: 20, pb: 0, pt: 2, px: 3, background: 'transparent' }}>Resend Invitation</DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: 16, color: '#222', mb: 1.5 }}>
            Resend invitation to <b>{resendEmail}</b>?
          </Typography>
          {resendError && <Alert severity="error" sx={{ mt: 2 }}>{resendError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
          <Button onClick={() => setResendDialogOpen(false)} disabled={resendLoading}
            sx={{
              minWidth: 80,
              height: 36,
              borderRadius: 2,
              border: '1.5px solid #E2E4E9',
              color: '#222',
              background: '#f7f8fa',
              fontWeight: 500,
              fontSize: 14,
              textTransform: 'none',
              boxShadow: 'none',
              mr: 1,
              '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleResendConfirm} variant="contained" disabled={resendLoading}
            sx={{
              minWidth: 120,
              height: 36,
              borderRadius: 2,
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              backgroundColor: '#5673DC',
              color: '#fff',
              boxShadow: 3,
              '&:hover': { backgroundColor: '#4A69D9' },
            }}
          >
            {resendLoading ? 'Resending...' : 'Resend Invitation'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default Users; 