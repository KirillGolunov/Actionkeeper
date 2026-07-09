import React, { useState, useEffect, useCallback } from 'react';
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
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EditIcon from '@mui/icons-material/Edit';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckIcon from '@mui/icons-material/Check';
import Snackbar from '@mui/material/Snackbar';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import PageLayout, {
  PageToolbar,
  pageFilterChipSx,
} from '../components/PageLayout';

function Users() {
  const { t, locale } = useTranslation();
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
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError] = useState(null);
  const [resendEmail, setResendEmail] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [ratesOpen, setRatesOpen] = useState(false);
  const [ratesUser, setRatesUser] = useState(null);
  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [rateSaving, setRateSaving] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [rateDraft, setRateDraft] = useState({ rateRubPerHour: '', effectiveFrom: '' });
  const [editRateOpen, setEditRateOpen] = useState(false);
  const [editingRateId, setEditingRateId] = useState(null);
  const [editRateDraft, setEditRateDraft] = useState({ rateRubPerHour: '', effectiveFrom: '', effectiveTo: '' });
  const { user: currentUser } = useAuth();

  const tagStyles = {
    active: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('users.active'),
    },
    deleted: {
      selected: { background: '#F5EAFE', color: '#A259E6', border: '1px solid #A259E6' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('users.deleted'),
    },
    user: {
      selected: { background: '#E6F0F5', color: '#3B6C74', border: '1px solid #3B6C74' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('users.user'),
    },
    admin: {
      selected: { background: '#F5EAFE', color: '#7C3A6A', border: '1px solid #7C3A6A' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('users.admin'),
    },
  };
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/users');
      console.log('Fetched users:', response.data);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(t('users.errors.fetch'));
    }
  }, [t]);

  const fetchInvitations = useCallback(async () => {
    try {
      const response = await axios.get('/api/invitations');
      return response.data;
    } catch (error) {
      return [];
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, [fetchUsers, fetchInvitations]);

  const handleClose = () => {
    setError(null);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (!newUser.name.trim()) {
      setError(t('users.validation.nameRequired'));
      return;
    }
    if (!newUser.surname.trim()) {
      setError(t('users.validation.surnameRequired'));
      return;
    }
    if (!newUser.email.trim()) {
      setError(t('users.validation.emailRequired'));
      return;
    }
    if (!isValidEmail(newUser.email)) {
      setError(t('users.validation.emailInvalid'));
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
        role: newUser.role,
      });
      fetchUsers();
      fetchInvitations();
      setNewUser({ name: '', surname: '', email: '', role: 'user' });
      setAddDraft({ name: '', surname: '', email: '', role: 'user' });
      setInviteDialogOpen(false);
      setSnackbarMsg(t('users.invitationSent'));
      setSnackbarOpen(true);
    } catch (error) {
      setError(getApiErrorMessage(error, t, 'users.errors.sendInvitation'));
    } finally {
      setInviteLoading(false);
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEditClose = () => {
    setError(null);
    setEditOpen(false);
    setEditUser(null);
  };

  const handleEditSave = async () => {
    try {
      if (!editUser.name.trim()) {
        setError(t('users.validation.nameRequired'));
        return;
      }
      if (!editUser.surname.trim()) {
        setError(t('users.validation.surnameRequired'));
        return;
      }
      if (!editUser.email.trim()) {
        setError(t('users.validation.emailRequired'));
        return;
      }
      if (!isValidEmail(editUser.email)) {
        setError(t('users.validation.emailInvalid'));
        return;
      }
      await axios.patch(`/api/users/${editUser.id}`, editUser);
      fetchUsers();
      handleEditClose();
    } catch (error) {
      setError(getApiErrorMessage(error, t, 'users.errors.update'));
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
      setError(t('users.errors.delete'));
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
      setError(t('users.validation.nameRequired'));
      return;
    }
    if (!addDraft.surname.trim()) {
      setError(t('users.validation.surnameRequired'));
      return;
    }
    if (!addDraft.email.trim()) {
      setError(t('users.validation.emailRequired'));
      return;
    }
    if (!isValidEmail(addDraft.email)) {
      setError(t('users.validation.emailInvalid'));
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
        setError(t('users.validation.allRequired'));
        return;
      }
      if (!isValidEmail(editUserDraft.email)) {
        setError(t('users.validation.emailInvalid'));
        return;
      }
      await axios.patch(`/api/users/${editUserDraft.id}`, editUserDraft);
      fetchUsers();
      setEditingUserId(null);
      setEditUserDraft(null);
      setError(null);
    } catch (error) {
      setError(getApiErrorMessage(error, t, 'users.errors.update'));
    }
  };

  // Helper: check if user is invited

  // Resend invitation logic
  const handleResendClick = (email) => {
    setResendEmail(email);
    setResendDialogOpen(true);
    setResendError(null);
  };
  const handleResendConfirm = async () => {
    setResendLoading(true);
    setResendError(null);
    try {
      await axios.post('/api/invitations', { email: resendEmail, invited_by: null });
      fetchInvitations();
      setSnackbarMsg(t('users.invitationResent'));
      setSnackbarOpen(true);
      setTimeout(() => setResendDialogOpen(false), 1200);
    } catch (error) {
      setResendError(getApiErrorMessage(error, t, 'users.errors.resendInvitation'));
    } finally {
      setResendLoading(false);
    }
  };

  const formatUserName = (user) => `${user?.surname || ''} ${user?.name || ''}`.trim() || user?.email || '';

  const formatRate = (value) => {
    const amount = Number(value) || 0;
    return new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(amount);
  };

  const rateText = useCallback((key, params = {}) => {
    const ruRates = {
      action: 'Ставки',
      title: 'Ставки: {{name}}',
      rate: 'Ставка, руб/ч',
      effectiveFrom: 'Действует с',
      effectiveTo: 'Действует до',
      createdBy: 'Кто добавил',
      createdAt: 'Когда',
      current: 'текущая',
      add: 'Добавить',
      edit: 'Редактировать',
      saving: 'Сохранение...',
      save: 'Сохранить',
      cancel: 'Отмена',
      empty: 'Ставки еще не заданы',
      saved: 'Ставка сохранена',
      updated: 'Ставка обновлена',
      'validation.rate': 'Укажите целую неотрицательную ставку',
      'validation.effectiveFrom': 'Укажите дату начала',
      'errors.fetch': 'Не удалось загрузить ставки.',
      'errors.save': 'Не удалось сохранить ставку.',
      'errors.overlap': 'Периоды ставок не должны пересекаться.',
    };

    const template = locale === 'ru' ? ruRates[key] : null;
    const value = template || t(`users.rates.${key}`);
    return Object.entries(params).reduce(
      (message, [paramKey, paramValue]) => message.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue)),
      value
    );
  }, [locale, t]);

  const fetchRates = useCallback(async (userId) => {
    setRatesLoading(true);
    setRateError(null);
    try {
      const response = await axios.get(`/api/admin/users/${userId}/rates`, { timeout: 8000 });
      setRates(response.data);
    } catch (error) {
      setRateError(rateText('errors.fetch'));
    } finally {
      setRatesLoading(false);
    }
  }, [rateText]);

  const handleRatesClick = (user) => {
    setRatesUser(user);
    setRatesOpen(true);
    setRateDraft({ rateRubPerHour: '', effectiveFrom: new Date().toISOString().slice(0, 10) });
    fetchRates(user.id);
  };

  const handleRatesClose = () => {
    setRatesOpen(false);
    setRatesUser(null);
    setRates([]);
    setRateError(null);
    setRateDraft({ rateRubPerHour: '', effectiveFrom: '' });
    setEditRateOpen(false);
    setEditingRateId(null);
    setEditRateDraft({ rateRubPerHour: '', effectiveFrom: '', effectiveTo: '' });
  };

  const handleCreateRate = async () => {
    const rate = Number(rateDraft.rateRubPerHour);
    if (!Number.isInteger(rate) || rate < 0) {
      setRateError(rateText('validation.rate'));
      return;
    }
    if (!rateDraft.effectiveFrom) {
      setRateError(rateText('validation.effectiveFrom'));
      return;
    }

    setRateSaving(true);
    setRateError(null);
    try {
      await axios.post(`/api/admin/users/${ratesUser.id}/rates`, {
        rateRubPerHour: rate,
        effectiveFrom: rateDraft.effectiveFrom,
      });
      setRateDraft({ rateRubPerHour: '', effectiveFrom: new Date().toISOString().slice(0, 10) });
      fetchRates(ratesUser.id);
      setSnackbarMsg(rateText('saved'));
      setSnackbarOpen(true);
    } catch (error) {
      const errorCode = error?.response?.data?.errorCode;
      setRateError(errorCode === 'rates.overlap' ? rateText('errors.overlap') : rateText('errors.save'));
    } finally {
      setRateSaving(false);
    }
  };

  const handleEditRateClick = (rate) => {
    setEditRateOpen(true);
    setEditingRateId(rate.id);
    setRateError(null);
    setEditRateDraft({
      rateRubPerHour: String(rate.rateRubPerHour ?? ''),
      effectiveFrom: rate.effectiveFrom || '',
      effectiveTo: rate.effectiveTo || '',
    });
  };

  const handleEditRateCancel = () => {
    setEditRateOpen(false);
    setEditingRateId(null);
    setEditRateDraft({ rateRubPerHour: '', effectiveFrom: '', effectiveTo: '' });
    setRateError(null);
  };

  const handleUpdateRate = async (rateId) => {
    const rate = Number(editRateDraft.rateRubPerHour);
    if (!Number.isInteger(rate) || rate < 0) {
      setRateError(rateText('validation.rate'));
      return;
    }
    if (!editRateDraft.effectiveFrom) {
      setRateError(rateText('validation.effectiveFrom'));
      return;
    }

    setRateSaving(true);
    setRateError(null);
    try {
      await axios.patch(`/api/admin/users/${ratesUser.id}/rates/${rateId}`, {
        rateRubPerHour: rate,
        effectiveFrom: editRateDraft.effectiveFrom,
        effectiveTo: editRateDraft.effectiveTo || null,
      });
      setEditRateOpen(false);
      setEditingRateId(null);
      setEditRateDraft({ rateRubPerHour: '', effectiveFrom: '', effectiveTo: '' });
      fetchRates(ratesUser.id);
      setSnackbarMsg(rateText('updated'));
      setSnackbarOpen(true);
    } catch (error) {
      const errorCode = error?.response?.data?.errorCode;
      setRateError(errorCode === 'rates.overlap' ? rateText('errors.overlap') : rateText('errors.save'));
    } finally {
      setRateSaving(false);
    }
  };

  const userTableCellSx = {
    px: 1.25,
    py: 1,
    minWidth: 0,
    overflow: 'hidden',
  };

  const userTableHeadCellSx = {
    ...userTableCellSx,
    fontWeight: 'bold',
  };

  const userTableInputSx = {
    minWidth: 0,
    width: '100%',
    background: '#f7f8fa',
    borderRadius: 2,
    '& .MuiOutlinedInput-root': {
      fontSize: 14,
      borderRadius: 2,
      background: '#f7f8fa',
      minWidth: 0,
    },
    '& .MuiSelect-select, & input': {
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  };

  const userSelectProps = {
    MenuProps: {
      PaperProps: {
        sx: { maxWidth: 220 },
      },
    },
  };

  const userActionCellWidth = 248;
  const userActionBoxSx = {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 0.75,
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    minWidth: 0,
  };

  const compactUserIconButtonSx = {
    minWidth: 36,
    width: 36,
    height: 32,
    borderRadius: 2,
    p: 0,
    flexShrink: 0,
    boxShadow: 'none',
  };

  const ellipsisTextSx = {
    display: 'block',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const stableDialogProps = {
    disableScrollLock: true,
  };

  return (
    <PageLayout
      title={t('users.title')}
      subtitle={`${users.length} ${locale === 'ru' ? '\u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435' : 'users in catalog'}`}
      toolbar={
        <PageToolbar
          start={
            <>
              {Object.keys(tagStyles).map((key) => (
                <Chip
                  key={key}
                  label={tagStyles[key].label}
                  clickable
                  onClick={() => setFilters(f => ({ ...f, [key]: !f[key] }))}
                  sx={{
                    ...pageFilterChipSx,
                    minWidth: 112,
                    ...((filters[key]) ? tagStyles[key].selected : tagStyles[key].default),
                  }}
                />
              ))}
            </>
          }
        />
      }
    >

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3, border: '1px solid #E2E4E9', borderRadius: '12px', boxShadow: '1', overflowX: 'hidden', width: '100%' }}>
        <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow sx={{ height: 40, minHeight: 40 }}>
              <TableCell sx={{ ...userTableHeadCellSx, width: '16%' }}>{t('users.surname')}</TableCell>
              <TableCell sx={{ ...userTableHeadCellSx, width: '14%' }}>{t('users.name')}</TableCell>
              <TableCell sx={{ ...userTableHeadCellSx, width: '25%' }}>{t('users.email')}</TableCell>
              <TableCell sx={{ ...userTableHeadCellSx, width: 132 }}>{t('users.role')}</TableCell>
              <TableCell sx={{ ...userTableHeadCellSx, width: 128 }}>{t('users.status')}</TableCell>
              {currentUser?.role === 'admin' && (
                <TableCell align="right" sx={{ ...userTableHeadCellSx, width: userActionCellWidth }}>{t('users.actions')}</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {currentUser?.role === 'admin' && (
              <TableRow>
                <TableCell sx={{ ...userTableCellSx, width: '16%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('users.surname')}
                    value={addDraft.surname}
                    onChange={e => setAddDraft(d => ({ ...d, surname: e.target.value }))}
                    sx={userTableInputSx}
                  />
                </TableCell>
                <TableCell sx={{ ...userTableCellSx, width: '14%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('users.name')}
                    value={addDraft.name}
                    onChange={e => setAddDraft(d => ({ ...d, name: e.target.value }))}
                    sx={userTableInputSx}
                  />
                </TableCell>
                <TableCell sx={{ ...userTableCellSx, width: '25%' }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={t('users.email')}
                    value={addDraft.email}
                    onChange={e => setAddDraft(d => ({ ...d, email: e.target.value }))}
                    sx={userTableInputSx}
                  />
                </TableCell>
                <TableCell sx={{ ...userTableCellSx, width: 132 }}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    value={addDraft.role}
                    onChange={e => setAddDraft(d => ({ ...d, role: e.target.value }))}
                    SelectProps={userSelectProps}
                    sx={userTableInputSx}
                  >
                    <MenuItem value="user">{t('users.user')}</MenuItem>
                    <MenuItem value="admin">{t('users.admin')}</MenuItem>
                  </TextField>
                </TableCell>
                <TableCell sx={{ ...userTableCellSx, width: 128 }}></TableCell>
                <TableCell align="right" sx={{ ...userTableCellSx, width: userActionCellWidth }}>
                  <Button size="small" variant="contained" onClick={handleAddUser}
                    sx={{
                      minWidth: 76,
                      width: 76,
                      height: 32,
                      borderRadius: 2,
                      fontWeight: 500,
                      fontSize: 12,
                      textTransform: 'none',
                      px: 1.2,
                      flexShrink: 0,
                      backgroundColor: '#8196E4',
                      color: '#FFFFFF',
                      boxShadow: 3,
                      '&:hover': { backgroundColor: '#4A69D9' },
                    }}
                  >
                    {t('users.add')}
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {sortedUsers.map((user) => {
              const isEditing = editingUserId === user.id;
              return (
                <TableRow key={user.id} sx={user.deleted ? { color: '#bdbdbd', '& td': { color: '#bdbdbd' } } : {}}>
                  <TableCell sx={{ ...userTableCellSx, width: '16%' }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.surname}
                        onChange={e => setEditUserDraft(d => ({ ...d, surname: e.target.value }))}
                        sx={userTableInputSx}
                      />
                    ) : (
                      <Tooltip title={user.surname} placement="top" arrow>
                        <Box component="span" sx={ellipsisTextSx}>{user.surname}</Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...userTableCellSx, width: '14%' }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.name}
                        onChange={e => setEditUserDraft(d => ({ ...d, name: e.target.value }))}
                        sx={userTableInputSx}
                      />
                    ) : (
                      <Tooltip title={user.name} placement="top" arrow>
                        <Box component="span" sx={ellipsisTextSx}>{user.name}</Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...userTableCellSx, width: '25%' }}>
                    {isEditing ? (
                      <TextField
                        size="small"
                        fullWidth
                        value={editUserDraft.email}
                        onChange={e => setEditUserDraft(d => ({ ...d, email: e.target.value }))}
                        sx={userTableInputSx}
                      />
                    ) : (
                      <Tooltip title={user.email} placement="top" arrow>
                        <Box component="span" sx={ellipsisTextSx}>{user.email}</Box>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={{ ...userTableCellSx, width: 132 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={editUserDraft.role}
                        onChange={e => setEditUserDraft(d => ({ ...d, role: e.target.value }))}
                        SelectProps={userSelectProps}
                        sx={userTableInputSx}
                      >
                        <MenuItem value="user">{t('users.user')}</MenuItem>
                        <MenuItem value="admin">{t('users.admin')}</MenuItem>
                      </TextField>
                    ) : (
                      <Chip
                        label={user.role === 'admin' ? t('users.admin') : t('users.user')}
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
                  <TableCell sx={{ ...userTableCellSx, width: 128 }}>
                    {isEditing ? (
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={editUserDraft.deleted ? 'deleted' : 'active'}
                        onChange={e => setEditUserDraft(d => ({ ...d, deleted: e.target.value === 'deleted' ? 1 : 0 }))}
                        SelectProps={userSelectProps}
                        sx={userTableInputSx}
                      >
                        <MenuItem value="active">{t('users.active')}</MenuItem>
                        <MenuItem value="deleted">{t('users.deleted')}</MenuItem>
                      </TextField>
                    ) : (
                      user.deleted ? (
                        <Chip label={t('users.deleted')} size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#F5F7FA', color: '#bdbdbd', border: '1px solid #bdbdbd', fontWeight: 400 }} />
                      ) : user.invited ? (
                        <Chip label={t('users.invited')} size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#FFF8E1', color: '#B28704', border: '1px solid #FFD600', fontWeight: 400 }} />
                      ) : (
                        <Chip label={t('users.active')} size="small" sx={{ fontSize: '11px', height: '20px', minWidth: '64px', borderRadius: '6px', background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC', fontWeight: 400 }} />
                      )
                    )}
                  </TableCell>
                  {currentUser?.role === 'admin' && (
                    <TableCell align="right" sx={{ ...userTableCellSx, width: userActionCellWidth }}>
                      {isEditing ? (
                        <Box sx={userActionBoxSx}>
                          <Tooltip title={t('common.actions.save')}>
                            <Button size="small" variant="contained" onClick={handleEditSaveInline}
                              sx={{
                                ...compactUserIconButtonSx,
                                border: '1.5px solid #5673DC',
                                color: '#fff',
                                background: '#5673DC',
                                '&:hover': { background: '#4A69D9', border: '1.5px solid #4A69D9' },
                              }}
                            >
                              <CheckIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                          <Tooltip title={t('common.actions.cancel')}>
                            <Button size="small" variant="contained" onClick={handleEditCancel}
                              sx={{
                                ...compactUserIconButtonSx,
                                border: '1.5px solid #d32f2f',
                                color: '#d32f2f',
                                background: '#FFEAEA',
                                '&:hover': { background: '#ffd6d6', border: '1.5px solid #b71c1c', color: '#b71c1c' },
                              }}
                            >
                              <CloseIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                        </Box>
                      ) : (
                        <Box sx={userActionBoxSx}>
                          {user.invited === 1 && !user.deleted && (
                            <Tooltip title={t('users.resendInvitation')}>
                              <Button size="small" onClick={() => handleResendClick(user.email)} sx={{ ...compactUserIconButtonSx, color: '#fff', background: '#5673DC', '&:hover': { background: '#4A69D9' } }}>
                                <AutorenewIcon fontSize="small" />
                              </Button>
                            </Tooltip>
                          )}
                          <Button size="small" variant="outlined" startIcon={<AttachMoneyIcon />} onClick={() => handleRatesClick(user)}
                            sx={{
                              minWidth: 92,
                              width: 92,
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
                              flexShrink: 0,
                              '& .MuiButton-startIcon': { mr: 0.5 },
                              '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
                            }}
                          >
                            {rateText('action')}
                          </Button>
                          <Tooltip title={t('users.editUser')}>
                            <Button size="small" variant="outlined" onClick={() => handleEditClick(user)}
                              sx={{
                                ...compactUserIconButtonSx,
                                border: '1.5px solid #E2E4E9',
                                color: '#222',
                                background: '#f7f8fa',
                                '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </Button>
                          </Tooltip>
                          <Tooltip title={t('clients.delete')}>
                            <Button size="small" color="error" onClick={() => handleDeleteUser(user)}
                              sx={{
                                ...compactUserIconButtonSx,
                                border: '1.5px solid #E2E4E9',
                                color: '#d32f2f',
                                background: '#f7f8fa',
                                '&:hover': { background: 'rgba(211,47,47,0.10)', border: '1.5px solid #d32f2f', color: '#d32f2f' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </Button>
                          </Tooltip>
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

      <Dialog open={open} onClose={handleClose} {...stableDialogProps}>
        <DialogTitle>{t('users.addUser')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('users.name')}
            fullWidth
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            error={!!error && !newUser.name.trim()}
            helperText={!newUser.name.trim() ? t('users.validation.nameRequired') : ''}
          />
          <TextField
            margin="dense"
            label={t('users.surname')}
            fullWidth
            value={newUser.surname}
            onChange={(e) => setNewUser({ ...newUser, surname: e.target.value })}
            error={!!error && !newUser.surname.trim()}
            helperText={!newUser.surname.trim() ? t('users.validation.surnameRequired') : ''}
          />
          <TextField
            margin="dense"
            label={t('users.email')}
            type="email"
            fullWidth
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            error={!!error && (!newUser.email.trim() || !isValidEmail(newUser.email))}
            helperText={
              !newUser.email.trim()
                ? t('users.validation.emailRequired')
                : !isValidEmail(newUser.email)
                ? t('users.validation.emailInvalid')
                : ''
            }
          />
          <TextField
            select
            fullWidth
            margin="dense"
            label={t('users.role')}
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <MenuItem value="user">{t('users.user')}</MenuItem>
            <MenuItem value="admin">{t('users.admin')}</MenuItem>
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
            {t('users.addUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={handleEditClose} {...stableDialogProps}>
        <DialogTitle>{t('users.editUser')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            value={editUser?.name || ''}
            onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
            error={!!error && !editUser?.name?.trim()}
            helperText={!editUser?.name?.trim() ? t('users.validation.nameRequired') : ''}
          />
          <TextField
            margin="dense"
            label="Surname"
            fullWidth
            value={editUser?.surname || ''}
            onChange={(e) => setEditUser({ ...editUser, surname: e.target.value })}
            error={!!error && !editUser?.surname?.trim()}
            helperText={!editUser?.surname?.trim() ? t('users.validation.surnameRequired') : ''}
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
                ? t('users.validation.emailRequired')
                : !isValidEmail(editUser?.email)
                ? t('users.validation.emailInvalid')
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

      <Dialog open={ratesOpen} onClose={handleRatesClose} maxWidth="md" fullWidth {...stableDialogProps}>
        <DialogTitle>{rateText('title', { name: formatUserName(ratesUser) })}</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {rateError && <Alert severity="error" sx={{ mb: 2 }}>{rateError}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) minmax(220px, 1fr) auto' }, gap: 2, alignItems: 'start', mb: 2, pt: 1 }}>
            <TextField
              label={rateText('rate')}
              type="number"
              size="small"
              fullWidth
              value={rateDraft.rateRubPerHour}
              onChange={(e) => setRateDraft((draft) => ({ ...draft, rateRubPerHour: e.target.value }))}
              inputProps={{ min: 0, step: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={rateText('effectiveFrom')}
              type="date"
              size="small"
              fullWidth
              value={rateDraft.effectiveFrom}
              onChange={(e) => setRateDraft((draft) => ({ ...draft, effectiveFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <Button
              variant="contained"
              startIcon={<AttachMoneyIcon />}
              onClick={handleCreateRate}
              disabled={rateSaving || !ratesUser}
              sx={{
                minWidth: 120,
                height: 40,
                borderRadius: 2,
                fontWeight: 600,
                fontSize: 14,
                textTransform: 'none',
                backgroundColor: '#5673DC',
                color: '#fff',
                boxShadow: 2,
                '&:hover': { backgroundColor: '#4A69D9' },
              }}
            >
              {rateSaving ? rateText('saving') : rateText('add')}
            </Button>
          </Box>

          {ratesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : rates.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {rateText('empty')}
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ border: '1px solid #E2E4E9', borderRadius: 2, boxShadow: 'none', overflowX: 'hidden' }}>
              <Table size="small" sx={{ tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, width: 170 }}>{rateText('rate')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 140 }}>{rateText('effectiveFrom')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 140 }}>{rateText('effectiveTo')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 210 }}>{rateText('createdBy')}</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 190 }}>{rateText('createdAt')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Tooltip title={rateText('edit')}>
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleEditRateClick(rate)}
                                disabled={rateSaving}
                                sx={{ minWidth: 32, width: 32, height: 30, borderRadius: 2, p: 0, flexShrink: 0 }}
                              >
                                <EditIcon fontSize="small" />
                              </Button>
                            </span>
                          </Tooltip>
                          <span>{formatRate(rate.rateRubPerHour)}</span>
                        </Box>
                      </TableCell>
                      <TableCell>{rate.effectiveFrom}</TableCell>
                      <TableCell>{rate.effectiveTo || rateText('current')}</TableCell>
                      <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <Tooltip title={rate.createdByName || ''}>
                          <span>{rate.createdByName || '-'}</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{rate.createdAt ? new Date(rate.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US') : '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRatesClose}
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
              '&:hover': { background: 'rgba(86,115,220,0.10)', border: '1.5px solid #5673DC', color: '#5673DC' },
            }}
          >
            {t('common.actions.close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editRateOpen} onClose={handleEditRateCancel} maxWidth="xs" fullWidth {...stableDialogProps}>
        <DialogTitle>{rateText('edit')}</DialogTitle>
        <DialogContent sx={{ pt: 2.5 }}>
          {rateError && <Alert severity="error" sx={{ mb: 2 }}>{rateError}</Alert>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label={rateText('rate')}
              type="number"
              size="small"
              fullWidth
              value={editRateDraft.rateRubPerHour}
              onChange={(e) => setEditRateDraft((draft) => ({ ...draft, rateRubPerHour: e.target.value }))}
              inputProps={{ min: 0, step: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={rateText('effectiveFrom')}
              type="date"
              size="small"
              fullWidth
              value={editRateDraft.effectiveFrom}
              onChange={(e) => setEditRateDraft((draft) => ({ ...draft, effectiveFrom: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={rateText('effectiveTo')}
              type="date"
              size="small"
              fullWidth
              value={editRateDraft.effectiveTo}
              onChange={(e) => setEditRateDraft((draft) => ({ ...draft, effectiveTo: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditRateCancel}
            disabled={rateSaving}
            variant="outlined"
            sx={{ minWidth: 80, height: 32, borderRadius: 2, textTransform: 'none' }}
          >
            {rateText('cancel')}
          </Button>
          <Button
            onClick={() => handleUpdateRate(editingRateId)}
            disabled={rateSaving || !editingRateId}
            variant="contained"
            sx={{ minWidth: 100, height: 32, borderRadius: 2, textTransform: 'none', backgroundColor: '#5673DC', '&:hover': { backgroundColor: '#4A69D9' } }}
          >
            {rateSaving ? rateText('saving') : rateText('save')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} {...stableDialogProps}>
        <DialogTitle>{t('common.actions.delete')}</DialogTitle>
        <DialogContent>
          <Typography>{t('users.confirmDelete', { name: `${userToDelete?.surname || ""} ${userToDelete?.name || ""}`.trim() })}</Typography>
          <FormControl component="fieldset" sx={{ mt: 2 }}>
            <FormLabel component="legend">{t('users.deleteHoursQuestion')}</FormLabel>
            <RadioGroup
              value={deleteOption}
              onChange={e => setDeleteOption(e.target.value)}
              sx={{ mt: 1 }}
            >
              <FormControlLabel value="keep" control={<Radio />} label={t('users.keepHours')} />
              <FormControlLabel value="delete" control={<Radio />} label={t('users.deleteHours')} />
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
            {deleteLoading ? t('users.deleting') : t('users.deleteUser')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)}
        {...stableDialogProps}
        PaperProps={{
          sx: { borderRadius: 3, p: 0, minWidth: 380, background: '#F7F8FA' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#5673DC', fontSize: 20, pb: 0, pt: 2, px: 3, background: 'transparent' }}>{t('users.sendInvitation')}</DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: 16, color: '#222', mb: 1.5 }}>
            {t('users.sendTo', { email: newUser.email })}
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
            {inviteLoading ? t('users.sending') : t('users.sendInvitation')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={resendDialogOpen} onClose={() => setResendDialogOpen(false)}
        {...stableDialogProps}
        PaperProps={{
          sx: { borderRadius: 3, p: 0, minWidth: 380, background: '#F7F8FA' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#5673DC', fontSize: 20, pb: 0, pt: 2, px: 3, background: 'transparent' }}>{t('users.resendInvitation')}</DialogTitle>
        <DialogContent sx={{ px: 3, pt: 2, pb: 1 }}>
          <Typography sx={{ fontSize: 16, color: '#222', mb: 1.5 }}>
            {t('users.resendTo', { email: resendEmail })}
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
            {resendLoading ? t('users.resending') : t('users.resendInvitation')}
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
    </PageLayout>
  );
}

export default Users; 
