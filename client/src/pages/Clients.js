import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

function Clients() {
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [error, setError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [editingClientId, setEditingClientId] = useState(null);
  const [editClientDraft, setEditClientDraft] = useState(null);
  const [addDraft, setAddDraft] = useState({ name: '', type: 'internal', itn: '' });
  const { user: currentUser } = useAuth();

  // Add tagStyles for Active and Total tags, matching Projects page
  const tagStyles = {
    active: {
      background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC',
    },
    total: {
      background: '#F5EAFE', color: '#A259E6', border: '1px solid #A259E6',
    },
    internal: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('clients.internal'),
    },
    external: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('clients.external'),
    },
  };

  const [filters, setFilters] = useState({ internal: false, external: false });
  // Initial load intentionally runs once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchClients();
    fetchProjects();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await axios.get('/api/clients');
      console.log('Fetched clients:', response.data);
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError(t('clients.errors.fetch'));
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      setError(t('clients.errors.fetchProjects'));
    }
  };

  const handleDeleteClient = (client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    setDeleteLoading(true);
    try {
      await axios.delete(`/api/clients/${clientToDelete.id}/full`);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      setDeleteLoading(false);
      fetchClients();
    } catch (error) {
      setError(t('clients.errors.delete'));
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      setDeleteLoading(false);
    }
  };

  const handleAddClient = async () => {
    try {
      if (!addDraft.name.trim()) {
        setError(t('clients.validation.nameRequired'));
        return;
      }
      await axios.post('/api/clients', addDraft);
      fetchClients();
      setAddDraft({ name: '', type: 'internal', itn: '' });
      setError(null);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setError(getApiErrorMessage(error, t, 'clients.errors.createDuplicate'));
      } else {
        setError(getApiErrorMessage(error, t, 'clients.errors.create'));
      }
    }
  };

  const handleEditClick = (client) => {
    setEditingClientId(client.id);
    setEditClientDraft({ ...client });
    setError(null);
  };

  const handleEditCancel = () => {
    setEditingClientId(null);
    setEditClientDraft(null);
    setError(null);
  };

  const handleEditSaveInline = async () => {
    try {
      if (!editClientDraft.name.trim()) {
        setError(t('clients.validation.nameRequired'));
        return;
      }
      // Duplicate check for name and ITN (ignore case and whitespace, exclude self)
      const normalize = str => (str || '').replace(/\s+/g, '').toLowerCase();
      const nameExists = clients.some(c => c.id !== editClientDraft.id && normalize(c.name) === normalize(editClientDraft.name));
      if (nameExists) {
        setError(t('clients.validation.duplicateName'));
        return;
      }
      if (editClientDraft.itn && editClientDraft.itn.trim()) {
        const itnExists = clients.some(c => c.id !== editClientDraft.id && c.itn && normalize(c.itn) === normalize(editClientDraft.itn));
        if (itnExists) {
          setError(t('clients.validation.duplicateItn'));
          return;
        }
      }
      await axios.patch(`/api/clients/${editClientDraft.id}`, editClientDraft);
      fetchClients();
      setEditingClientId(null);
      setEditClientDraft(null);
      setError(null);
    } catch (error) {
      setError(getApiErrorMessage(error, t, 'clients.errors.update'));
    }
  };

  // Filter clients by type
  const filteredClients = clients.filter(client => {
    if (filters.internal && client.type !== 'internal') return false;
    if (filters.external && client.type !== 'external') return false;
    return true;
  });
  // Before rendering clients.map, sort by created_at descending
  const sortedClients = [...filteredClients].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4">{t('clients.title')}</Typography>
          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
            {['internal', 'external'].map((key) => (
              <Chip
                key={key}
                label={tagStyles[key].label}
                clickable
                onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                sx={{
                  fontSize: '12px',
                  height: '20px',
                  minWidth: '64px',
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
              <TableCell align="left" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 550, maxWidth: 550 }}>{t('clients.name')}</TableCell>
              <TableCell align="left" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 150, maxWidth: 150 }}>{t('clients.itn')}</TableCell>
              <TableCell align="left" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 150, maxWidth: 150 }}>{t('clients.type')}</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 150, maxWidth: 150 }}>{t('clients.projects')}</TableCell>
              {currentUser?.role === 'admin' && (
                <TableCell align="right" sx={{ fontWeight: 'bold', p: 0, pt: 1, px: 2, py: 1, width: 200, maxWidth: 200 }}>{t('clients.actions')}</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentUser?.role === 'admin' && (
              <TableRow>
                <TableCell align="left" sx={{ px: 2, py: 1, width: 550, maxWidth: 550 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('clients.clientName')}
                    value={addDraft.name}
                    onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                    error={!!error && !addDraft.name.trim()}
                    sx={{
                      background: '#f7f8fa',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-root': {
                        fontSize: 14,
                        borderRadius: 2,
                        background: '#f7f8fa',
                      },
                    }}
                  />
                </TableCell>
                <TableCell align="left" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('clients.itn')}
                    value={addDraft.itn}
                    onChange={e => setAddDraft(d => ({ ...d, itn: e.target.value }))}
                    sx={{
                      background: '#f7f8fa',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-root': {
                        fontSize: 14,
                        borderRadius: 2,
                        background: '#f7f8fa',
                      },
                    }}
                  />
                </TableCell>
                <TableCell align="left" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={addDraft.type}
                    onChange={e => setAddDraft(d => ({ ...d, type: e.target.value }))}
                    sx={{
                      background: '#f7f8fa',
                      borderRadius: 2,
                      '& .MuiOutlinedInput-root': {
                        fontSize: 14,
                        borderRadius: 2,
                        background: '#f7f8fa',
                      },
                    }}
                  >
                    <MenuItem value="internal">{t('clients.internal')}</MenuItem>
                    <MenuItem value="external">{t('clients.external')}</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell align="center" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}></TableCell>
                <TableCell align="right" sx={{ px: 2, py: 1, width: 260, maxWidth: 260 }}>
                  <Button size="small" variant="contained" color="primary" onClick={handleAddClient}
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
                    {t('clients.add')}
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {/* Client rows */}
            {sortedClients.map((client) => {
              const clientProjects = projects.filter(p => p.client_id === client.id);
              const activeCount = clientProjects.filter(p => p.active).length;
              const totalCount = clientProjects.length;
              const isEditing = editingClientId === client.id;
              return (
                <TableRow key={client.id}>
                  <TableCell align="left" sx={{ px: 2, py: 1, width: 550, maxWidth: 550 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editClientDraft.name}
                        onChange={e => setEditClientDraft(d => ({ ...d, name: e.target.value }))}
                        error={!!error && !editClientDraft.name.trim()}
                        sx={{
                          background: '#f7f8fa',
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            fontSize: 14,
                            borderRadius: 2,
                            background: '#f7f8fa',
                          },
                        }}
                      />
                    ) : (
                      <Tooltip title={client.name} placement="top" arrow>
                        <span style={{ display: 'inline-block', maxWidth: 550, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>{client.name}</span>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="left" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editClientDraft.itn}
                        onChange={e => setEditClientDraft(d => ({ ...d, itn: e.target.value }))}
                        sx={{
                          background: '#f7f8fa',
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            fontSize: 14,
                            borderRadius: 2,
                            background: '#f7f8fa',
                          },
                        }}
                      />
                    ) : (
                      client.itn || '-'
                    )}
                  </TableCell>
                  <TableCell align="left" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={editClientDraft.type}
                        onChange={e => setEditClientDraft(d => ({ ...d, type: e.target.value }))}
                        sx={{
                          background: '#f7f8fa',
                          borderRadius: 2,
                          '& .MuiOutlinedInput-root': {
                            fontSize: 14,
                            borderRadius: 2,
                            background: '#f7f8fa',
                          },
                        }}
                      >
                        <MenuItem value="internal">{t('clients.internal')}</MenuItem>
                        <MenuItem value="external">{t('clients.external')}</MenuItem>
                      </TextField>
                    ) : (
                      <Chip
                        label={client.type === 'internal' ? t('clients.internal') : t('clients.external')}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '64px',
                          borderRadius: '6px',
                          px: 1.5,
                          fontWeight: 400,
                          boxShadow: 'none',
                          ...(client.type === 'internal' ? tagStyles.internal.selected : tagStyles.external.selected),
                        }}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center" sx={{ px: 2, py: 1, width: 150, maxWidth: 150 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <Chip
                        label={t('clients.activeCount', { count: activeCount })}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '72px',
                          borderRadius: '6px',
                          px: 'none',
                          fontWeight: 400,
                          boxShadow: 'none',
                          ...(totalCount === 0
                            ? { background: '#F5F7FA', color: '#bdbdbd', border: '1px solid #bdbdbd' }
                            : tagStyles.active),
                        }}
                      />
                      <Chip
                        label={t('clients.totalCount', { count: totalCount })}
                        size="small"
                        sx={{
                          fontSize: '11px',
                          height: '20px',
                          minWidth: '72px',
                          borderRadius: '6px',
                          px: 'none',
                          fontWeight: 400,
                          boxShadow: 'none',
                          ...(totalCount === 0
                            ? { background: '#F5F7FA', color: '#bdbdbd', border: '1px solid #bdbdbd' }
                            : tagStyles.total),
                        }}
                      />
                    </Box>
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell align="right" sx={{ px: 2, py: 1, width: 260, maxWidth: 260 }}>
                      {isEditing ? (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
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
                              '&:hover': {
                                background: '#4A69D9',
                                border: '1.5px solid #4A69D9',
                              },
                            }}
                          >
                            {t('common.actions.save')}
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
                              '&:hover': {
                                background: '#ffd6d6',
                                border: '1.5px solid #b71c1c',
                                color: '#b71c1c',
                              },
                            }}
                          >
                            {t('common.actions.cancel')}
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
                          <Button size="small" variant="outlined" onClick={() => handleEditClick(client)}
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
                            }}>
                            {t('clients.edit')}
                          </Button>
                          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDeleteClient(client)}
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
                            }}>
                            {t('clients.delete')}
                          </Button>
                        </Box>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <ConfirmationDialog
        open={deleteDialogOpen}
        title={t('clients.deleteTitle')}
        content={t('clients.confirmDelete', { name: clientToDelete?.name })}
        onCancel={() => !deleteLoading && setDeleteDialogOpen(false)}
        onConfirm={confirmDeleteClient}
        confirmLabel={deleteLoading ? <><CircularProgress size={18} color="inherit" sx={{ mr: 1 }} />{t('clients.delete')}</> : t('clients.delete')}
        cancelLabel={t('common.actions.cancel')}
      />
    </Box>
  );
}

export default Clients; 