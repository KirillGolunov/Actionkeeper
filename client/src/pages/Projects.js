import React, { useState, useEffect, useCallback } from 'react';
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
  IconButton,
  Tooltip,
  Chip,
  Autocomplete,
  Popover,
  Checkbox,
  FormControlLabel,
  Divider,
  ClickAwayListener,
} from '@mui/material';
import axios from 'axios';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import Switch from '@mui/material/Switch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import ProjectAnalyticsDialog from '../components/ProjectAnalyticsDialog';
import ProjectAnalyticsButton from '../components/ProjectAnalyticsButton';
import PageLayout, {
  PageToolbar,
  pageActionButtonSx,
  pageFilterChipSx,
} from '../components/PageLayout';
import {
  PROJECT_CATEGORY_OPTIONS,
  PROJECT_CATEGORY_ORDER,
  PROJECT_CATEGORY_TRANSITION,
  getProjectCategoryMeta,
} from '../utils/projectCategories';

function Projects() {
  const { t, locale } = useTranslation();
  const isRussian = locale === 'ru';
  const categoryFieldLabel = isRussian ? 'Категория' : 'Category';
  const categoryHelpText = isRussian
    ? 'Категория обязательна для новых и обновляемых проектов.'
    : 'Category is required for new and updated projects.';
  const categoryRequiredText = isRussian
    ? 'Выберите категорию проекта'
    : 'Please select a project category';
  const unclassifiedFilterLabel = isRussian
    ? 'Требуют классификации'
    : 'Needs classification';
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [managerCandidates, setManagerCandidates] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [categoriesAnchorEl, setCategoriesAnchorEl] = useState(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '',
    client_id: '',
    code: '',
    category: '',
    managerUserId: null,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState([]);
  const [filters, setFilters] = useState({
    scope: 'mine',
    active: true,
    closed: false,
    external_delivery: false,
    internal_project: false,
    operations: false,
    people_development: false,
    time_off: false,
    unclassified: false,
  });
  const { user: currentUser } = useAuth();
  const canEdit = currentUser?.role === 'admin';

  // Helper to normalize strings: remove all whitespace and lowercase
  const normalize = str => (str || '').replace(/\s+/g, '').toLowerCase();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setError(t('projects.errors.fetch'));
    }
  }, [t]);

  const fetchClients = useCallback(async () => {
    try {
      const response = await axios.get('/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      setError(t('projects.errors.fetchClients'));
    }
  }, [t]);

  const fetchManagerCandidates = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    try {
      const response = await axios.get('/api/users');
      setManagerCandidates(response.data.filter((candidate) => (
        !candidate.deleted && !candidate.invited && ['user', 'admin'].includes(candidate.role)
      )));
    } catch (fetchError) {
      console.error('Error fetching project manager candidates:', fetchError);
      setError(t('projects.manager.errors.fetchCandidates'));
    }
  }, [currentUser?.role, t]);

  useEffect(() => {
    fetchProjects();
    fetchClients();
    fetchManagerCandidates();
  }, [fetchProjects, fetchClients, fetchManagerCandidates]);

  const handleOpen = () => {
    if (!canEdit) return;
    setError(null);
    setNotice(null);
    setOpen(true);
  };

  const handleClose = () => {
    setError(null);
    setOpen(false);
  };

  const handleAnalyticsOpen = (project) => {
    setSelectedProject(project);
    setAnalyticsOpen(true);
  };

  const handleAnalyticsClose = () => {
    setAnalyticsOpen(false);
    setSelectedProject(null);
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
      if (!newProject.category) {
        setError(categoryRequiredText);
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
      const projectResponse = await axios.post('/api/projects', {
        name: newProject.name,
        description: newProject.description,
        client_id: newProject.client_id,
        code: newProject.code,
        category: newProject.category,
      });
      if (newProject.managerUserId) {
        try {
          const managerResponse = await axios.put(`/api/admin/projects/${projectResponse.data.id}/manager`, {
            managerUserId: newProject.managerUserId,
          });
          if (managerResponse.data.emailDelivery === 'failed') {
            setNotice(t('projects.manager.emailFailed'));
          }
        } catch (managerError) {
          console.error('Project created but manager assignment failed:', managerError);
          setNotice(t('projects.manager.errors.createdWithoutManager'));
        }
      }
      fetchProjects();
      setOpen(false);
      setNewProject({ 
        name: '', 
        description: '',
        client_id: '',
        code: '',
        category: '',
        managerUserId: null,
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
    setNotice(null);
    setEditProject({ ...project, managerUserId: project.manager_user_id || null, originalManagerUserId: project.manager_user_id || null });
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
      if (!editProject.category) {
        setError(categoryRequiredText);
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
      const { name, description, client_id, code, category } = editProject;
      await axios.patch(`/api/projects/${editProject.id}`, { name, description, client_id, code, category });
      if (Number(editProject.managerUserId || 0) !== Number(editProject.originalManagerUserId || 0)) {
        try {
          const managerResponse = await axios.put(`/api/admin/projects/${editProject.id}/manager`, {
            managerUserId: editProject.managerUserId || null,
          });
          if (managerResponse.data.emailDelivery === 'failed') {
            setNotice(t('projects.manager.emailFailed'));
          }
        } catch (managerError) {
          console.error('Project updated but manager assignment failed:', managerError);
          setNotice(t('projects.manager.errors.updatedWithoutManager'));
        }
      }
      fetchProjects();
      setEditOpen(false);
      setEditProject(null);
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

  const activeCategoryFilters = Object.entries(filters)
    .filter(([key, enabled]) => enabled && !['scope', 'active', 'closed'].includes(key))
    .map(([key]) => key);

  const filteredProjects = projects.filter(project => {
    if (filters.scope === 'mine' && !project.is_my_project) return false;
    if (filters.scope === 'managed' && Number(project.manager_user_id) !== Number(currentUser?.id)) return false;
    const statusVisible = (project.active && filters.active) || (!project.active && filters.closed);
    if (!statusVisible) return false;
    if (activeCategoryFilters.length > 0 && !activeCategoryFilters.includes(project.category || PROJECT_CATEGORY_TRANSITION.value)) {
      return false;
    }
    return true;
  });
  const hasDefaultStatusAndCategories = filters.active && !filters.closed && activeCategoryFilters.length === 0;
  const showDefaultMineEmptyState = filters.scope === 'mine' && hasDefaultStatusAndCategories;
  const showDefaultManagedEmptyState = filters.scope === 'managed' && hasDefaultStatusAndCategories;

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const categoryIndexA = PROJECT_CATEGORY_ORDER.indexOf(a.category || PROJECT_CATEGORY_TRANSITION.value);
    const categoryIndexB = PROJECT_CATEGORY_ORDER.indexOf(b.category || PROJECT_CATEGORY_TRANSITION.value);
    if (categoryIndexA !== categoryIndexB) return categoryIndexA - categoryIndexB;
    return a.name.localeCompare(b.name, isRussian ? 'ru' : 'en', { sensitivity: 'base' });
  });

  const groupedProjects = PROJECT_CATEGORY_ORDER
    .map((categoryValue) => ({
      categoryValue,
      meta: getProjectCategoryMeta(categoryValue),
      projects: sortedProjects.filter((project) => (project.category || PROJECT_CATEGORY_TRANSITION.value) === categoryValue),
    }))
    .filter((group) => group.projects.length > 0);

  const getCategoryChipStyles = (categoryValue) => {
    const palette = {
      external_delivery: { background: '#EAF4EC', color: '#245C34', border: '1px solid #7FB48F' },
      internal_project: { background: '#EEF1FF', color: '#4256B2', border: '1px solid #93A2E8' },
      operations: { background: '#FFF4E8', color: '#9A5B10', border: '1px solid #E5B16D' },
      people_development: { background: '#F7ECFF', color: '#7A3FA0', border: '1px solid #C59BDF' },
      time_off: { background: '#FBECEC', color: '#A23D3D', border: '1px solid #E0A0A0' },
      unclassified: { background: '#F3F4F6', color: '#5F6B7A', border: '1px dashed #AAB3BE' },
    };
    return palette[categoryValue] || palette.unclassified;
  };

  const scopeTagStyles = {
    mine: {
      selected: { background: '#EEF3FF', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.filters.mine'),
      tooltip: t('projects.filters.tooltips.mine'),
    },
    managed: {
      selected: { background: '#EEF3FF', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.filters.managed'),
      tooltip: t('projects.filters.tooltips.managed'),
    },
    all: {
      selected: { background: '#EEF3FF', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.filters.all'),
      tooltip: t('projects.filters.tooltips.all'),
    },
  };

  const statusTagStyles = {
    active: {
      selected: { background: '#F5F7FE', color: '#5673DC', border: '1px solid #5673DC' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.active'),
      tooltip: t('projects.filters.tooltips.active'),
    },
    closed: {
      selected: { background: '#F5EAFE', color: '#A259E6', border: '1px solid #A259E6' },
      default: { background: '#F5F7FA', color: '#90A0B7', border: 'none' },
      label: t('projects.closed'),
      tooltip: t('projects.filters.tooltips.closed'),
    },
  };

  const categoryFilterOptions = [
    ...PROJECT_CATEGORY_OPTIONS.map((category) => ({
      key: category.value,
      label: category.label,
      shortLabel: {
        external_delivery: isRussian ? 'Внешние' : 'External',
        internal_project: isRussian ? 'Внутренние' : 'Internal',
        operations: isRussian ? 'Операционка' : 'Operations',
        people_development: isRussian ? 'Развитие' : 'Development',
        time_off: isRussian ? 'Отсутствия' : 'Time off',
      }[category.value] || category.label,
      tooltip: t(`projects.filters.tooltips.${category.value}`),
    })),
    {
      key: PROJECT_CATEGORY_TRANSITION.value,
      label: unclassifiedFilterLabel,
      shortLabel: isRussian ? 'Без категории' : 'Unclassified',
      tooltip: t('projects.filters.tooltips.unclassified'),
    },
  ];

  const scopeFilterOptions = Object.keys(scopeTagStyles).map((key) => ({
    key,
    ...scopeTagStyles[key],
  }));

  const statusFilterOptions = Object.keys(statusTagStyles).map((key) => ({
    key,
    ...statusTagStyles[key],
  }));

  const hasNonDefaultFilters = filters.scope !== 'mine'
    || !filters.active
    || filters.closed
    || activeCategoryFilters.length > 0;

  const clearCategoryFilters = () => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      external_delivery: false,
      internal_project: false,
      operations: false,
      people_development: false,
      time_off: false,
      unclassified: false,
    }));
  };

  const resetFilters = () => {
    setFilters({
      scope: 'mine',
      active: true,
      closed: false,
      external_delivery: false,
      internal_project: false,
      operations: false,
      people_development: false,
      time_off: false,
      unclassified: false,
    });
  };

  return (
    <PageLayout
      title={t('projects.title')}
      subtitle={projects.length + (isRussian ? ' \u043f\u0440\u043e\u0435\u043a\u0442\u0430 \u0432 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0435' : ' projects in catalog')}
      actions={
        canEdit ? (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{
              ...pageActionButtonSx,
              width: { xs: '100%', md: 'auto' },
            }}
          >
            {t('projects.addProject')}
          </Button>
        ) : null
      }
      toolbar={
        <PageToolbar sx={{ py: { xs: 1, md: 1 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', md: 'center' },
              justifyContent: 'space-between',
              gap: { xs: 1, md: 1.25 },
              flexDirection: { xs: 'column', md: 'row' },
            }}
          >
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                flexWrap: 'nowrap',
                overflowX: 'auto',
                width: { xs: '100%', md: 'auto' },
                pb: { xs: 0.25, md: 0 },
                scrollbarWidth: 'thin',
              }}
            >
              {scopeFilterOptions.map((scope) => (
                <Tooltip key={scope.key} title={scope.tooltip} arrow>
                  <Chip
                    label={scope.label}
                    clickable
                    onClick={() => setFilters((currentFilters) => ({ ...currentFilters, scope: scope.key }))}
                    sx={{
                      ...pageFilterChipSx,
                      flexShrink: 0,
                      ...(filters.scope === scope.key ? scope.selected : scope.default),
                    }}
                  />
                </Tooltip>
              ))}
            </Box>

            <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 0.25 }} />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {statusFilterOptions.map((status) => (
                  <Tooltip key={status.key} title={status.tooltip} arrow>
                    <Chip
                      label={status.label}
                      clickable
                      onClick={() => setFilters((currentFilters) => ({ ...currentFilters, [status.key]: !currentFilters[status.key] }))}
                      sx={{
                        ...pageFilterChipSx,
                        ...(filters[status.key] ? status.selected : status.default),
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 0.25 }} />

              <Tooltip title={t('projects.filters.categoriesTooltip')} arrow>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowDropDownIcon />}
                  onClick={(event) => setCategoriesAnchorEl((anchor) => anchor ? null : event.currentTarget)}
                  aria-haspopup="true"
                  aria-expanded={Boolean(categoriesAnchorEl)}
                  sx={{
                    height: 32,
                    borderRadius: '10px',
                    px: 1.25,
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 500,
                    boxShadow: 'none',
                    whiteSpace: 'nowrap',
                    color: '#5673DC',
                    borderColor: activeCategoryFilters.length > 0 ? '#5673DC' : '#D7DFF5',
                    backgroundColor: activeCategoryFilters.length > 0 ? '#EEF3FF' : '#FFFFFF',
                    '&:hover': {
                      color: '#4256B2',
                      borderColor: '#5673DC',
                      backgroundColor: '#EEF3FF',
                      boxShadow: 'none',
                    },
                  }}
                >
                  {t('projects.filters.categories')}{activeCategoryFilters.length > 0 ? ` · ${activeCategoryFilters.length}` : ''}
                </Button>
              </Tooltip>

              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, mx: 0.25 }} />

              <Button
                onClick={resetFilters}
                disabled={!hasNonDefaultFilters}
                sx={{
                  ml: { xs: 0, md: 'auto' },
                  color: '#5673DC',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: 13,
                  minWidth: isRussian ? 72 : 48,
                  px: 0.5,
                  '&:hover': {
                    background: 'transparent',
                    color: '#4256B2',
                  },
                  '&.Mui-disabled': {
                    color: '#AEB8CA',
                    background: 'transparent',
                  },
                }}
              >
                {isRussian ? 'Сбросить' : 'Reset'}
              </Button>
            </Box>

            <Popover
              open={Boolean(categoriesAnchorEl)}
              anchorEl={categoriesAnchorEl}
              onClose={() => setCategoriesAnchorEl(null)}
              hideBackdrop
              disableScrollLock
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
              transformOrigin={{ vertical: 'top', horizontal: 'left' }}
              sx={{ pointerEvents: 'none' }}
              PaperProps={{
                sx: {
                  pointerEvents: 'auto',
                  mt: 0.75,
                  width: 390,
                  maxWidth: 'calc(100vw - 32px)',
                  borderRadius: 2.5,
                  border: '1px solid #D2DCF2',
                  backgroundColor: '#FFFFFF',
                  color: '#222832',
                  boxShadow: '0 14px 36px rgba(53, 67, 112, 0.18)',
                },
              }}
            >
              <ClickAwayListener
                onClickAway={(event) => {
                  if (categoriesAnchorEl?.contains(event.target)) return;
                  setCategoriesAnchorEl(null);
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ color: '#222832', fontSize: 14, fontWeight: 700, mb: 1 }}>
                    {t('projects.filters.categoriesTitle')}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, columnGap: 1.5, rowGap: 0.25 }}>
                    {categoryFilterOptions.map((category) => (
                      <Tooltip key={category.key} title={category.tooltip} arrow placement="right">
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={!!filters[category.key]}
                              onChange={() => setFilters((currentFilters) => ({ ...currentFilters, [category.key]: !currentFilters[category.key] }))}
                              sx={{
                                color: '#AEB8CA',
                                '&.Mui-checked': { color: '#5673DC' },
                                '&:hover': { backgroundColor: '#EEF3FF' },
                              }}
                            />
                          }
                          label={category.shortLabel}
                          sx={{
                            m: 0,
                            minWidth: 0,
                            color: '#222832',
                            '& .MuiFormControlLabel-label': { fontSize: 13 },
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                  {activeCategoryFilters.length > 0 && (
                    <>
                      <Divider sx={{ my: 1, borderColor: '#D2DCF2' }} />
                      <Button
                        size="small"
                        onClick={clearCategoryFilters}
                        sx={{
                          px: 0,
                          color: '#5673DC',
                          textTransform: 'none',
                          fontSize: 13,
                          '&:hover': {
                            color: '#4256B2',
                            backgroundColor: 'transparent',
                          },
                        }}
                      >
                        {t('projects.filters.clearCategories')}
                      </Button>
                    </>
                  )}
                </Box>
              </ClickAwayListener>
            </Popover>
          </Box>
        </PageToolbar>
      }
    >

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="warning" onClose={() => setNotice(null)} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filteredProjects.length === 0 && (
          <Alert severity="info">
            {showDefaultMineEmptyState
              ? t('projects.filters.emptyMine')
              : showDefaultManagedEmptyState
                ? t('projects.filters.emptyManaged')
                : t('projects.filters.empty')}
          </Alert>
        )}
        {groupedProjects.map((group) => (
          <Box key={group.categoryValue}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: 18, fontWeight: 600 }}>
                {group.meta.label}
              </Typography>
              <Chip
                size="small"
                label={group.projects.length}
                sx={{
                  height: 22,
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: '999px',
                  ...getCategoryChipStyles(group.categoryValue),
                }}
              />
            </Box>
            <Grid container spacing={3}>
              {group.projects.map((project) => {
                const expanded = expandedProjectIds.includes(project.id);
                const categoryMeta = getProjectCategoryMeta(project.category);
                return (
                  <Grid item xs={12} sm={6} md={4} key={project.id}>
                    <Card
                      sx={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid rgba(214, 222, 240, 0.95)',
                        borderRadius: '14px',
                        boxShadow: '0 8px 24px rgba(90, 112, 184, 0.08)',
                        minHeight: 150,
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 12px 28px rgba(90, 112, 184, 0.12)',
                          borderColor: 'rgba(173, 188, 228, 0.95)',
                        },
                      }}
                    >
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
                        <Box sx={{ mb: 0.75, mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={categoryMeta.label}
                            sx={{
                              height: 22,
                              fontSize: 12,
                              fontWeight: 500,
                              borderRadius: '6px',
                              ...getCategoryChipStyles(project.category),
                            }}
                          />
                        </Box>
                        <Typography color="text.secondary" variant="body2" sx={{ mb: 0.25, fontSize: 13, lineHeight: 1.3 }}>
                          {t('projects.client')}: {getClientName(project.client_id)}{(() => {
                            const client = clients.find((c) => c.id === project.client_id);
                            return client && client.type ? ` (${client.type.charAt(0).toUpperCase() + client.type.slice(1)})` : '';
                          })()}
                        </Typography>
                        {(project.manager_user_id || canEdit) && (
                          <Typography color="text.secondary" variant="body2" sx={{ mb: 0.25, fontSize: 13, lineHeight: 1.3 }}>
                            {t('projects.manager.label')}: {project.manager_user_id
                              ? [project.manager_surname, project.manager_name].filter(Boolean).join(' ')
                              : t('projects.manager.unassigned')}
                          </Typography>
                        )}
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
                            {canEdit && (
                              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mt: 0.5, mb: 1 }}>
                                <ProjectAnalyticsButton onClick={() => handleAnalyticsOpen(project)} />
                                <Box sx={{ flex: 1 }} />
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
                              </Box>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>

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
            label={categoryFieldLabel}
            value={newProject.category}
            onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
            error={!!error && !newProject.category}
            helperText={!newProject.category ? categoryRequiredText : categoryHelpText}
          >
            {PROJECT_CATEGORY_OPTIONS.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>
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
          <Autocomplete
            options={managerCandidates}
            value={managerCandidates.find((candidate) => candidate.id === newProject.managerUserId) || null}
            onChange={(_event, candidate) => setNewProject({ ...newProject, managerUserId: candidate?.id || null })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(candidate) => `${[candidate.surname, candidate.name].filter(Boolean).join(' ')} · ${candidate.email} · ${candidate.role === 'admin' ? t('users.admin') : t('users.user')}`}
            renderInput={(params) => <TextField {...params} margin="dense" label={t('projects.manager.label')} placeholder={t('projects.manager.unassigned')} />}
          />
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

      <ProjectAnalyticsDialog
        open={analyticsOpen}
        project={selectedProject}
        onClose={handleAnalyticsClose}
      />

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
            label={categoryFieldLabel}
            value={editProject?.category || ''}
            onChange={(e) => setEditProject({ ...editProject, category: e.target.value })}
            error={!!error && !editProject?.category}
            helperText={!editProject?.category ? categoryRequiredText : categoryHelpText}
          >
            {PROJECT_CATEGORY_OPTIONS.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </TextField>
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
          <Autocomplete
            options={managerCandidates}
            value={managerCandidates.find((candidate) => candidate.id === editProject?.managerUserId) || null}
            onChange={(_event, candidate) => setEditProject({ ...editProject, managerUserId: candidate?.id || null })}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            getOptionLabel={(candidate) => `${[candidate.surname, candidate.name].filter(Boolean).join(' ')} · ${candidate.email} · ${candidate.role === 'admin' ? t('users.admin') : t('users.user')}`}
            renderInput={(params) => <TextField {...params} margin="dense" label={t('projects.manager.label')} placeholder={t('projects.manager.unassigned')} />}
          />
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
    </PageLayout>
  );
}

export default Projects;

