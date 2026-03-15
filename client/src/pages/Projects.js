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
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import DeleteIcon from '@mui/icons-material/Delete';
import Switch from '@mui/material/Switch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

function Projects() {
  const { t, locale } = useTranslation();
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
    code: '',
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [filters, setFilters] = useState({ active: false, closed: false, external: false, internal: false });
  const { user: currentUser } = useAuth();
  const canEdit = currentUser?.role === 'admin';
  console.log('[Projects] currentUser:', currentUser);

  // Helper to normalize strings: remove all whitespace and lowercase
  const normalize = str => (str || '').replace(/\s+/g, '').toLowerCase();
  // Initial load intentionally runs once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setError(t('projects.errors.fetch'));
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      console.log('Fetched clients:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError(t('projects.errors.fetchClients'));
    }
  };

  const fetchTimeEntries = async (projectId) => {
    try {
      const response = await axios.get(`/api/time-entries?project_id=${projectId}`);
      console.log('Fetched time entries:', response.data);
      setTimeEntries(response.data.filter(entry => entry.project_id === projectId));
    } catch (error) {
      console.error('Error fetching time entries:', error);
      setError(t('projects.errors.fetchTimeEntries'));
    }
  };

  const handleOpen = () => {
    if (!canEdit) return;
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
    if (!canEdit) return;
    try {
      if (!newProject.name.trim()) {
        setError(t('projects.validation.nameRequired'));
        return;
      }
      if (!newProject.client_id) {
        setError(t('projects.validation.clientRequired'));
        return;
      }
      // Duplicate check for name (ignore case and whitespace)
      const nameExists = projects.some(p => normalize(p.name) === normalize(newProject.name));
      if (nameExists) {
        setError(t('projects.validation.duplicateName'));
        return;
      }
      // Duplicate check for code (if code is set, ignore case and whitespace)
      if (newProject.code && newProject.code.trim()) {
        const codeExists = projects.some(p => p.code && normalize(p.code) === normalize(newProject.code));
        if (codeExists) {
          setError(t('projects.validation.duplicateCode'));
          return;
        }
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
        code: '',
      });
    } catch (error) {
      console.error('Error creating project:', error);
      setError(getApiErrorMessage(error, t, 'projects.errors.create'));
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : t('projects.noClient');
  };

  const handleEditOpen = (project) => {
    if (!canEdit) return;
    setError(null);
    setEditProject({ ...project });
    setEditOpen(true);
  };

  const handleEditClose = () => {
    setError(null);
    setEditOpen(false);
    setEditProject(null);
  };

  const handleEditSave = async () => {
    if (!canEdit) return;
    try {
      if (!editProject.name.trim()) {
        setError(t('projects.validation.nameRequired'));
        return;
      }
      if (!editProject.client_id) {
        setError(t('projects.validation.clientRequired'));
        return;
      }
      // Duplicate check for name (exclude self, ignore case and whitespace)
      const nameExists = projects.some(p => p.id !== editProject.id && normalize(p.name) === normalize(editProject.name));
      if (nameExists) {
        setError(t('projects.validation.duplicateName')); 
        return;
      }
      // Duplicate check for code (if code is set, exclude self, ignore case and whitespace)
      if (editProject.code && editProject.code.trim()) {
        const codeExists = projects.some(p => p.id !== editProject.id && p.code && normalize(p.code) === normalize(editProject.code));
        if (codeExists) {
          setError(t('projects.validation.duplicateCode')); 
          return;
        }
      }
      const { name, description, client_id, code } = editProject;
      await axios.patch(`/api/projects/${editProject.id}`, { name, description, client_id, code });
      fetchProjects();
      handleEditClose();
    } catch (error) {
      setError(getApiErrorMessage(error, t, 'projects.errors.update'));
    }
  };

  const handleDeleteProject = (project) => {
    if (!canEdit) return;
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      // Delete all time entries for this project
      await axios.delete(`/api/time-entries/by-project/${projectToDelete.id}`);
      // Delete the project itself
      await axios.delete(`/api/projects/${projectToDelete.id}`);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (error) {
      setError(t('projects.errors.delete'));
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const sortedEntries = [...timeEntries]
    .sort((a, b) => new Date(b.submission_time) - new Date(a.submission_time))
    .map((entry, idx) => ({ ...entry, entry_number: idx + 1 }));

  const dateLocale = locale === 'ru' ? ru : enUS;

  const formatEntryWeekday = (dateValue) => {
    if (!dateValue) return '';

    try {
      return format(parseISO(dateValue), 'EEEE', { locale: dateLocale });
    } catch (error) {
      console.error('Failed to format project entry weekday:', error);
      return '';
    }
  };

  const filteredProjects = projects.filter(project => {
    const client = clients.find((c) => c.id === project.client_id);
    if (filters.active && !project.active) return false;
    if (filters.closed && project.active) return false;
    if (filters.external && (!client || client.type !== 'external')) return false;
    if (filters.internal && (!client || client.type !== 'internal')) return false;
    return true;
  });

  const tagStyles = {
    active: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.active'),
    },
    closed: {
      selected: { background: '#F5EAFE', color: '#A259E6', border: '1px solid #A259E6' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.closed'),
    },
    external: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.external'),
    },
    internal: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.internal'),
    },
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">{t('projects.title')}</Typography>
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
        {canEdit && (
          <Button variant="contained" color="primary" onClick={handleOpen}
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
            {t('projects.addProject')}
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {filteredProjects.map((project) => {
          const expanded = expandedProjectIds.includes(project.id);
          return (
            <Grid item xs={12} sm={6} md={4} key={project.id}>
              <Card sx={{ border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: 1, minHeight: 150, transition: 'box-shadow 0.2s' }}>
                <CardContent sx={{ p: 1.5, pb: '12px !important', minHeight: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Tooltip title={project.name} placement="top" arrow>
                      <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, fontSize: 17, pr: 1, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {project.name}
                      </Typography>
                    </Tooltip>
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, gap: 0.3 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (expanded) {
                            setExpandedProjectIds(expandedProjectIds.filter(id => id !== project.id));
                          } else {
                            setExpandedProjectIds([...expandedProjectIds, project.id]);
                          }
                        }}
                        aria-label={expanded ? t('projects.collapse') : t('projects.expand')}
                        sx={{
                          height: 28,
                          width: 28,
                          color: '#5673DC',
                          backgroundColor: 'rgba(86,115,220,0.08)',
                          mr: 0.25,
                          '&:hover': {
                            backgroundColor: 'rgba(86,115,220,0.14)',
                          },
                        }}
                      >
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                      <Typography sx={{ fontWeight: 500, fontSize: 13, color: project.active ? '#5673DC' : '#bdbdbd', lineHeight: 1, display: 'flex', alignItems: 'center', mr: 0.5 }}>
                        {project.active ? t('projects.activeStatus') : t('projects.closedStatus')}
                      </Typography>
                      <Switch
                        size="small"
                        checked={!!project.active}
                        onChange={async (e) => {
                          if (!canEdit) return;
                          try {
                            await axios.patch(`/api/projects/${project.id}/active`, { active: e.target.checked ? 1 : 0 });
                            fetchProjects();
                          } catch (err) {
                            setError(t('projects.errors.updateStatus'));
                          }
                        }}
                        disabled={!canEdit}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: '#fff',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#5673DC',
                            opacity: 1,
                          },
                          '& .MuiSwitch-thumb': {
                            backgroundColor: '#fff',
                            boxShadow: '1',
                          },
                          '& .MuiSwitch-track': {
                            backgroundColor: '#E2E4E9',
                            opacity: 1,
                          },
                        }}
                      />
                    </Box>
                  </Box>
                  {project.code !== undefined && (
                    <Typography variant="caption" sx={{ color: '#5673DC', fontWeight: 500, fontSize: 13, mb: 0.25, display: 'block', textAlign: 'left', mt: 0.5 }}>
                      {t('projects.code')}: {project.code ? project.code : t('projects.noCode')}
                    </Typography>
                  )}
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 0.25, fontSize: 13, lineHeight: 1.3 }}>
                    {t('projects.client')}: {getClientName(project.client_id)}{(() => {
                      const client = clients.find((c) => c.id === project.client_id);
                      return client && client.type ? ` (${client.type.charAt(0).toUpperCase() + client.type.slice(1)})` : '';
                    })()}
                  </Typography>
                  {!expanded && project.description && (
                    <Typography color="text.secondary" variant="body2" sx={{ fontSize: 13, lineHeight: 1.3, mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {project.description}
                    </Typography>
                  )}
                  {expanded && (
                    <>
                      <Typography color="text.secondary" variant="body2" sx={{ fontSize: 13, lineHeight: 1.3, mb: 0.5 }}>
                        {project.description}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 0.5, mb: 1 }}>
                        {/* Left: View Time Entries */}
                        <Button 
                          size="small" 
                          color="primary"
                          onClick={() => handleTimeEntriesOpen(project)}
                          sx={{ minWidth: 70, height: 32, borderRadius: 2, fontWeight: 500, fontSize: 12, textTransform: 'none', px: 1.2, ml: 0, pl: 0 }}
                        >
                          {t('projects.viewTimeEntries')}
                        </Button>
                        {/* Spacer to push edit/delete to right */}
                        <Box sx={{ flex: 1 }} />
                        {/* Right: Edit and Delete */}
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleEditOpen(project)}
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
                            ml: 1,
                            '&:hover': {
                              background: 'rgba(86,115,220,0.10)',
                              border: '1.5px solid #5673DC',
                              color: '#5673DC',
                            },
                          }}
                        >
                          {t('users.editUser')}
                        </Button>
                        {currentUser?.role === 'admin' && (
                          <Button
                            size="small"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => handleDeleteProject(project)}
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
                              '&:hover': {
                                background: 'rgba(211,47,47,0.10)',
                                border: '1.5px solid #d32f2f',
                                color: '#d32f2f',
                              },
                            }}
                          >
                            {t('projects.deleteProject')}
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{t('projects.addProject')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            select
            fullWidth
            margin="dense"
            label={t('projects.client')}
            value={newProject.client_id}
            onChange={(e) => setNewProject({ ...newProject, client_id: e.target.value })}
            error={!!error && !newProject.client_id}
            helperText={!newProject.client_id ? t('projects.validation.clientRequired') : ''}
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
            label={t('projects.projectName')}
            fullWidth
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            error={!!error && !newProject.name.trim()}
            helperText={!newProject.name.trim() ? t('projects.validation.nameRequired') : ''}
          />
          <TextField
            margin="dense"
            label={t('projects.projectCode')}
            fullWidth
            value={newProject.code}
            onChange={(e) => setNewProject({ ...newProject, code: e.target.value })}
          />
          <TextField
            margin="dense"
            label={t('projects.description')}
            fullWidth
            multiline
            rows={4}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
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
            {t('common.actions.cancel')}
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
            {t('projects.addProject')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={timeEntriesOpen}
        onClose={handleTimeEntriesClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('projects.timeEntriesFor', { name: selectedProject?.name })}</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>{t('projects.dateWeekday')}</TableCell>
                  <TableCell>{t('projects.user')}</TableCell>
                  <TableCell>{t('projects.hours')}</TableCell>
                  <TableCell>{t('projects.submissionDateTime')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.entry_number}</TableCell>
                    <TableCell>{entry.date} ({formatEntryWeekday(entry.date)})</TableCell>
                    <TableCell>{entry.user_name}</TableCell>
                    <TableCell>{entry.hours}</TableCell>
                    <TableCell>{format(new Date(entry.submission_time), 'Pp', { locale: dateLocale })}</TableCell>
                  </TableRow>
                ))}
                {timeEntries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      {t('projects.noTimeEntries')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTimeEntriesClose}>{t('common.actions.close')}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose}>
        <DialogTitle>{t('projects.editProject')}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            select
            fullWidth
            margin="dense"
            label={t('projects.client')}
            value={editProject?.client_id || ''}
            onChange={(e) => setEditProject({ ...editProject, client_id: e.target.value })}
            error={!!error && !editProject?.client_id}
            helperText={!editProject?.client_id ? t('projects.validation.clientRequired') : ''}
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
            label={t('projects.projectName')}
            fullWidth
            value={editProject?.name || ''}
            onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
            error={!!error && !editProject?.name?.trim()}
            helperText={!editProject?.name?.trim() ? t('projects.validation.nameRequired') : ''}
          />
          <TextField
            margin="dense"
            label={t('projects.projectCode')}
            fullWidth
            value={editProject?.code || ''}
            onChange={(e) => setEditProject({ ...editProject, code: e.target.value })}
          />
          <TextField
            margin="dense"
            label={t('projects.description')}
            fullWidth
            multiline
            rows={4}
            value={editProject?.description || ''}
            onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
          />
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
            {t('common.actions.cancel')}
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
            {t('common.actions.save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('projects.deleteProject')}</DialogTitle>
        <DialogContent>
          <Typography>{t('projects.confirmDelete', { name: projectToDelete?.name })}</Typography>
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
            {t('common.actions.cancel')}
          </Button>
          <Button onClick={confirmDeleteProject} color="error" variant="contained"
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
          >
            {t('projects.deleteProject')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Projects;

