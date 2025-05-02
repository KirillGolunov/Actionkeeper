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
} from '@mui/material';
import axios from 'axios';

function Users() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'user',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    fetchUsers();
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
      if (!newUser.name.trim()) {
        setError('Name is required');
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

      console.log('Submitting new user:', newUser);
      const response = await axios.post('/api/users', newUser);
      console.log('User created:', response.data);
      
      fetchUsers();
      handleClose();
      setNewUser({
        name: '',
        email: '',
        role: 'user',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      setError(error.response?.data?.error || 'Failed to create user. Please try again.');
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Users</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => handleEditOpen(user)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
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
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Users; 