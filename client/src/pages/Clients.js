import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import axios from 'axios';

function Clients() {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [error, setError] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    type: 'internal',
  });
  const [editClient, setEditClient] = useState(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      console.log('Fetched clients:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError('Failed to fetch clients. Please try again.');
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

  const handleEditOpen = (client) => {
    setError(null);
    setEditClient(client);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setError(null);
    setEditOpen(false);
    setEditClient(null);
  };

  const handleSubmit = async () => {
    try {
      if (!newClient.name.trim()) {
        setError('Client name is required');
        return;
      }

      console.log('Submitting new client:', newClient);
      const response = await axios.post('/api/clients', newClient);
      console.log('Client created:', response.data);
      
      fetchClients();
      handleClose();
      setNewClient({
        name: '',
        type: 'internal',
      });
    } catch (error) {
      console.error('Error creating client:', error);
      setError(error.response?.data?.error || 'Failed to create client. Please try again.');
    }
  };

  const handleEditSave = async () => {
    try {
      if (!editClient.name.trim()) {
        setError('Client name is required');
        return;
      }
      await axios.patch(`/api/clients/${editClient.id}`, editClient);
      fetchClients();
      handleEditClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update client. Please try again.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Clients</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Client
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
              <TableCell>Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>{client.name}</TableCell>
                <TableCell>{client.type}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="outlined" onClick={() => handleEditOpen(client)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            fullWidth
            value={newClient.name}
            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
            error={!!error}
            helperText={error}
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Client Type"
            value={newClient.type}
            onChange={(e) => setNewClient({ ...newClient, type: e.target.value })}
          >
            <MenuItem value="internal">Internal</MenuItem>
            <MenuItem value="external">External</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Add Client
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Client</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Client Name"
            fullWidth
            value={editClient?.name || ''}
            onChange={(e) => setEditClient({ ...editClient, name: e.target.value })}
            error={!!error}
            helperText={error}
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label="Client Type"
            value={editClient?.type || 'internal'}
            onChange={(e) => setEditClient({ ...editClient, type: e.target.value })}
          >
            <MenuItem value="internal">Internal</MenuItem>
            <MenuItem value="external">External</MenuItem>
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

export default Clients; 