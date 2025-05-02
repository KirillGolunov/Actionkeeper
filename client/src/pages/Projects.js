import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
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
import { format } from 'date-fns';

function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [timeEntriesOpen, setTimeEntriesOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [timeEntries, setTimeEntries] = useState([]);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '',
    client_id: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchClients();
  }, []);

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

  const fetchTimeEntries = async (projectId) => {
    try {
      const response = await axios.get(`/api/time-entries?project_id=${projectId}`);
      console.log('Fetched time entries:', response.data);
      setTimeEntries(response.data.filter(entry => entry.project_id === projectId));
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError('Failed to fetch time entries. Please try again.');
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

  const handleTimeEntriesOpen = async (project) => {
    setSelectedProject(project);
    await fetchTimeEntries(project.id);
    setTimeEntriesOpen(true);
  };

  const handleTimeEntriesClose = () => {
    setTimeEntriesOpen(false);
    setSelectedProject(null);
    setTimeEntries([]);
  };

  const handleSubmit = async () => {
    try {
      if (!newProject.name.trim()) {
        setError('Project name is required');
        return;
      }

      if (!newProject.client_id) {
        setError('Please select a client');
        return;
      }

      console.log('Submitting new project:', newProject);
      const response = await axios.post('/api/projects', newProject);
      console.log('Project created:', response.data);
      
      fetchProjects();
      handleClose();
      setNewProject({ 
        name: '', 
        description: '',
        client_id: '',
      });
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error.response?.data?.error || 'Failed to create project. Please try again.');
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : 'No Client';
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffInMilliseconds = end - start;
    const hours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleEditOpen = (project) => {
    setError(null);
    setEditProject(project);
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setError(null);
    setEditOpen(false);
    setEditProject(null);
  };

  const handleEditSave = async () => {
    try {
      if (!editProject.name.trim()) {
        setError('Project name is required');
        return;
      }
      if (!editProject.client_id) {
        setError('Please select a client');
        return;
      }
      const { name, description, client_id } = editProject;
      await axios.patch(`/api/projects/${editProject.id}`, { name, description, client_id });
      fetchProjects();
      handleEditClose();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update project. Please try again.');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" color="primary" onClick={handleOpen}>
          Add Project
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" component="div">
                  {project.name}
                </Typography>
                <Typography color="text.secondary" gutterBottom>
                  Client: {getClientName(project.client_id)}
                </Typography>
                <Typography color="text.secondary">
                  {project.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  color="primary"
                  onClick={() => handleTimeEntriesOpen(project)}
                >
                  View Time Entries
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleEditOpen(project)}
                >
                  Edit
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Add New Project</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="Client"
            value={newProject.client_id}
            onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
            error={!!error && !newProject.client_id}
            helperText={!newProject.client_id ? 'Please select a client' : ''}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name} ({client.type})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            error={!!error && !newProject.name.trim()}
            helperText={!newProject.name.trim() ? 'Project name is required' : ''}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Add Project
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={timeEntriesOpen}
        onClose={handleTimeEntriesClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Time Entries for {selectedProject?.name}
        </DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Start Time</TableCell>
                  <TableCell>End Time</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {format(new Date(entry.start_time), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      {format(new Date(entry.end_time), 'PPpp')}
                    </TableCell>
                    <TableCell>
                      {calculateDuration(entry.start_time, entry.end_time)}
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                  </TableRow>
                ))}
                {timeEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No time entries found for this project
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTimeEntriesClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            margin="dense"
            label="Client"
            value={editProject?.client_id || ''}
            onChange={(e) => setEditProject({ ...editProject, client_id: e.target.value })}
            error={!!error && !editProject?.client_id}
            helperText={!editProject?.client_id ? 'Please select a client' : ''}
          >
            {clients.map((client) => (
              <MenuItem key={client.id} value={client.id}>
                {client.name} ({client.type})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            autoFocus
            margin="dense"
            label="Project Name"
            fullWidth
            value={editProject?.name || ''}
            onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
            error={!!error && !editProject?.name?.trim()}
            helperText={!editProject?.name?.trim() ? 'Project name is required' : ''}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={editProject?.description || ''}
            onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
          />
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

export default Projects; 