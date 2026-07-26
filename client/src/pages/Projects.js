import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Popover,
  Checkbox,
  FormControlLabel,
  Divider,
  ClickAwayListener,
  CircularProgress,
  Snackbar,
  Stack,
  Menu,
  MenuItem,
  ToggleButton,
} from '@mui/material';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';
import ProjectBudgetSection, { emptyBudgetDraft, validateBudgetDraft } from '../components/ProjectBudgetSection';
import ProjectBudgetOverview from '../components/ProjectBudgetOverview';
import ProjectHoursOverview from '../components/ProjectHoursOverview';
import ProjectDialogLayout from '../components/ProjectDialogLayout';
import ProjectDetailsForm from '../components/ProjectDetailsForm';
import {
  getProjectStatusLabelSx,
  projectCardSurfaceSx,
} from '../utils/projectCardSurface';
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
  const categoryFieldLabel = t('projects.category');
  const categoryRequiredText = t('projects.validation.categoryRequired');
  const unclassifiedFilterLabel = t('projects.filters.unclassified');
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [managerCandidates, setManagerCandidates] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [categoriesAnchorEl, setCategoriesAnchorEl] = useState(null);
  const [newProject, setNewProject] = useState({ 
    name: '', 
    description: '',
    client_id: '',
    code: '',
    category: '',
    managerUserId: null,
  });
  const [newProjectBudget, setNewProjectBudget] = useState(emptyBudgetDraft());
  const [newProjectBudgetPreview, setNewProjectBudgetPreview] = useState(emptyBudgetDraft());
  const [newProjectBudgetReason, setNewProjectBudgetReason] = useState('');
  const [createBudgetEditing, setCreateBudgetEditing] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [editViewMode, setEditViewMode] = useState('budget');
  const [editHoursActivated, setEditHoursActivated] = useState(false);
  const [editBudgetEditing, setEditBudgetEditing] = useState(false);
  const [editBudgetPreviewDraft, setEditBudgetPreviewDraft] = useState(null);
  const [editBudgetDirty, setEditBudgetDirty] = useState(false);
  const [editBudgetMeta, setEditBudgetMeta] = useState({ primaryVisible: false, primaryDisabled: true, hasErrors: false });
  const [editBudgetStatus, setEditBudgetStatus] = useState(null);
  const [editBudgetHistory, setEditBudgetHistory] = useState({ versions: [], requests: [], events: [] });
  const [editBudgetLoading, setEditBudgetLoading] = useState(false);
  const [editBudgetLoadError, setEditBudgetLoadError] = useState(null);
  const [confirmNavigation, setConfirmNavigation] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeSaving, setActiveSaving] = useState(false);
  const budgetSectionRef = useRef(null);
  const detailsFormRef = useRef(null);
  const editViewButtonRefs = useRef({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [projectActionsAnchorEl, setProjectActionsAnchorEl] = useState(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [pendingBudgetRequests, setPendingBudgetRequests] = useState([]);
  const [filters, setFilters] = useState({
    scope: 'mine',
    active: true,
    closed: false,
    requiresDecision: false,
    external_delivery: false,
    internal_project: false,
    operations: false,
    people_development: false,
    time_off: false,
    unclassified: false,
  });
  const { user: currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const canEdit = currentUser?.role === 'admin';
  const deepLinkParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusedBudgetRequestId = deepLinkParams.get('requestId');
  const focusedBudgetNotificationId = deepLinkParams.get('notificationId');
  const initialBudgetView = deepLinkParams.get('view');
  const deepLinkTargetsEditProject = Number(deepLinkParams.get('projectId')) === Number(editProject?.id);
  const isEditProjectManager = Number(editProject?.manager_user_id) === Number(currentUser?.id);
  const canViewEditProjectFinance = Boolean(canEdit || isEditProjectManager);
  const fetchPendingBudgetRequests = useCallback(async () => {
    if (currentUser?.role !== 'admin') {
      setPendingBudgetRequests([]);
      return;
    }
    try {
      const response = await axios.get('/api/admin/project-budget-change-requests?status=pending');
      setPendingBudgetRequests(response.data || []);
    } catch (fetchError) {
      console.error('Error fetching pending budget requests:', fetchError);
    }
  }, [currentUser?.role]);

  const loadEditBudgetData = useCallback(async () => {
    if (!editOpen || !editProject?.id || !canViewEditProjectFinance) return null;
    setEditBudgetLoading(true);
    setEditBudgetLoadError(null);
    try {
      const [statusResult, historyResult] = await Promise.allSettled([
        axios.get(`/api/projects/${editProject.id}/budget`),
        axios.get(`/api/projects/${editProject.id}/budget-history`),
      ]);
      if (statusResult.status === 'rejected') throw statusResult.reason;
      const statusResponse = statusResult.value;
      setEditBudgetStatus(statusResponse.data);
      setProjects((items) => items.map((project) => (
        Number(project.id) === Number(editProject.id)
          ? { ...project, has_pending_budget_request: statusResponse.data?.activeRequest ? 1 : 0 }
          : project
      )));
      if (historyResult.status === 'fulfilled') {
        setEditBudgetHistory(historyResult.value.data || { versions: [], requests: [], events: [] });
      } else {
        console.warn('Budget history could not be loaded:', historyResult.reason);
        setEditBudgetHistory({ versions: [], requests: [], events: [] });
      }
      if (canEdit) fetchPendingBudgetRequests();
      return statusResponse.data;
    } catch (budgetError) {
      setEditBudgetLoadError(getApiErrorMessage(budgetError, t, 'projects.budget.errors.fetch'));
      return null;
    } finally {
      setEditBudgetLoading(false);
    }
  }, [editOpen, editProject?.id, canViewEditProjectFinance, canEdit, fetchPendingBudgetRequests, t]);

  useEffect(() => {
    if (editOpen && editProject?.id && canViewEditProjectFinance) loadEditBudgetData();
  }, [editOpen, editProject?.id, canViewEditProjectFinance, loadEditBudgetData]);

  const projectComparable = useCallback((project) => JSON.stringify({
    name: project?.name || '',
    description: project?.description || '',
    client_id: project?.client_id || '',
    code: project?.code || '',
    category: project?.category || '',
    managerUserId: project?.managerUserId || null,
    active: project?.active === undefined ? true : Boolean(project.active),
  }), []);
  const emptyProjectComparable = useMemo(() => projectComparable({}), [projectComparable]);
  const createProjectDirty = projectComparable(newProject) !== emptyProjectComparable;
  const createBudgetDirty = JSON.stringify(newProjectBudget) !== JSON.stringify(emptyBudgetDraft()) || Boolean(newProjectBudgetReason.trim());

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
    fetchPendingBudgetRequests();
  }, [fetchProjects, fetchClients, fetchManagerCandidates, fetchPendingBudgetRequests]);

  useEffect(() => {
    if (!canEdit) return undefined;
    const intervalId = window.setInterval(fetchPendingBudgetRequests, 30000);
    return () => window.clearInterval(intervalId);
  }, [canEdit, fetchPendingBudgetRequests]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('budget') !== '1' || editOpen || projects.length === 0) return;
    const project = projects.find((item) => Number(item.id) === Number(params.get('projectId')));
    if (project) {
      handleEditOpen(project, 'budget');
    }
  // The URL is an entry trigger; form state changes must not reopen the dialog.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, projects, canEdit, currentUser?.id]);

  const handleOpen = () => {
    if (!canEdit) return;
    setError(null);
    setNotice(null);
    setFormErrors({});
    setCreateBudgetEditing(false);
    setOpen(true);
  };

  const handleCreateBudgetChange = (nextDraft) => {
    setNewProjectBudget(nextDraft);
    if (Object.keys(validateBudgetDraft(nextDraft, true)).length === 0) {
      setNewProjectBudgetPreview(nextDraft);
    }
  };

  const forceCreateClose = () => {
    setError(null);
    setOpen(false);
    setConfirmNavigation(null);
  };

  const handleClose = () => {
    if (createProjectDirty || createBudgetDirty) {
      setConfirmNavigation({ dialog: 'create', kind: 'close' });
      return;
    }
    forceCreateClose();
  };

  const validateProjectForm = (project, excludedProjectId = null) => {
    const nextErrors = {};
    if (!project.name?.trim()) nextErrors.name = t('projects.validation.nameRequired');
    if (!project.client_id) nextErrors.client = t('projects.validation.clientRequired');
    if (!project.category) nextErrors.category = categoryRequiredText;
    if (project.name?.trim() && projects.some((item) => item.id !== excludedProjectId && normalize(item.name) === normalize(project.name))) {
      nextErrors.name = t('projects.validation.duplicateName');
    }
    if (project.code?.trim() && projects.some((item) => item.id !== excludedProjectId && item.code && normalize(item.code) === normalize(project.code))) {
      nextErrors.code = t('projects.validation.duplicateCode');
    }
    return nextErrors;
  };

  const handleSubmit = async () => {
    if (!canEdit || saving) return false;
    const nextErrors = validateProjectForm(newProject);
    const budgetErrors = validateBudgetDraft(newProjectBudget, true);
    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return false;
    }
    if (Object.keys(budgetErrors).length > 0) {
      setCreateBudgetEditing(true);
      setError(t('projects.budget.validation.fixErrors'));
      return false;
    }
    if (newProjectBudget.budgetMode !== 'none' && !newProjectBudgetReason.trim()) {
      setCreateBudgetEditing(true);
      setError(t('projects.budget.validation.reasonRequired'));
      return false;
    }
    setSaving(true);
    setFormErrors({});
    setError(null);
    try {
      const projectResponse = await axios.post('/api/projects', {
        name: newProject.name,
        description: newProject.description,
        client_id: newProject.client_id,
        code: newProject.code,
        category: newProject.category,
      });
      let managerSaved = !newProject.managerUserId;
      let budgetSaved = newProjectBudget.budgetMode === 'none';
      let partialMessage = null;
      if (newProject.managerUserId) {
        try {
          const managerResponse = await axios.put(`/api/admin/projects/${projectResponse.data.id}/manager`, {
            managerUserId: newProject.managerUserId,
          });
          managerSaved = true;
          if (managerResponse.data.emailDelivery === 'failed') {
            partialMessage = t('projects.manager.emailFailed');
          }
        } catch (managerError) {
          console.error('Project created but manager assignment failed:', managerError);
          partialMessage = t('projects.manager.errors.createdWithoutManager');
        }
      }
      if (newProjectBudget.budgetMode !== 'none') {
        try {
          await axios.patch(`/api/admin/projects/${projectResponse.data.id}/budget`, {
            reason: newProjectBudgetReason,
            budget: newProjectBudget,
          });
          budgetSaved = true;
        } catch (budgetError) {
          console.error('Project created but budget failed:', budgetError);
          partialMessage = t('projects.budget.errors.createdWithoutBudget');
        }
      }
      await fetchProjects();

      if (!managerSaved || !budgetSaved) {
        const assignedManager = managerSaved
          ? managerCandidates.find((candidate) => Number(candidate.id) === Number(newProject.managerUserId))
          : null;
        const createdProject = {
          ...projectResponse.data,
          manager_user_id: assignedManager?.id || null,
          managerUserId: assignedManager?.id || null,
          originalManagerUserId: assignedManager?.id || null,
          manager_name: assignedManager?.name || '',
          manager_surname: assignedManager?.surname || '',
        };
        setOpen(false);
        setEditProject(createdProject);
        setEditBudgetEditing(!budgetSaved);
        setEditOpen(true);
        setNotice(partialMessage);
      } else {
        forceCreateClose();
        setNotice(partialMessage);
      }
      setNewProject({ 
        name: '', 
        description: '',
        client_id: '',
        code: '',
        category: '',
        managerUserId: null,
      });
      setNewProjectBudget(emptyBudgetDraft());
      setNewProjectBudgetPreview(emptyBudgetDraft());
      setNewProjectBudgetReason('');
      setFormErrors({});
      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      setError(getApiErrorMessage(error, t, 'projects.errors.create'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? client.name : t('projects.noClient');
  };

  const handleEditOpen = (project, initialMode = 'project') => {
    setError(null);
    setNotice(null);
    setFormErrors({});
    const nextProject = { ...project, managerUserId: project.manager_user_id || null, originalManagerUserId: project.manager_user_id || null };
    const isManager = Number(project.manager_user_id) === Number(currentUser?.id);
    const nextViewMode = initialMode === 'budget' || canEdit || isManager ? 'budget' : 'hours';
    setEditProject(nextProject);
    setEditViewMode(nextViewMode);
    setEditHoursActivated(nextViewMode === 'hours');
    setEditBudgetEditing(initialMode === 'budget');
    setEditBudgetPreviewDraft(null);
    setEditBudgetDirty(false);
    setEditBudgetStatus(null);
    setEditBudgetHistory({ versions: [], requests: [], events: [] });
    setEditBudgetLoadError(null);
    setEditBudgetMeta({ primaryVisible: false, primaryDisabled: true, hasErrors: false });
    setEditOpen(true);
  };

  const forceEditClose = () => {
    setError(null);
    setProjectActionsAnchorEl(null);
    setEditOpen(false);
    setEditProject(null);
    setEditViewMode('budget');
    setEditHoursActivated(false);
    setEditBudgetDirty(false);
    setEditBudgetStatus(null);
    setEditBudgetHistory({ versions: [], requests: [], events: [] });
    setEditBudgetLoadError(null);
    setEditBudgetEditing(false);
    setEditBudgetPreviewDraft(null);
    setEditBudgetMeta({ primaryVisible: false, primaryDisabled: true, loading: false, hasErrors: false });
    setConfirmNavigation(null);
    if (deepLinkTargetsEditProject) navigate('/projects', { replace: true });
  };

  const handleEditClose = async () => {
    const fieldSaved = await detailsFormRef.current?.commitActive?.();
    if (fieldSaved === false) return;
    if (editBudgetDirty) {
      setConfirmNavigation({ dialog: 'edit', kind: 'close-budget' });
      return;
    }
    forceEditClose();
  };

  const handleInlineProjectSave = async (field, nextValue) => {
    if (!editProject?.id) return { ok: false, error: t('projects.errors.update') };
    const isManager = Number(editProject.manager_user_id) === Number(currentUser?.id);
    if (!canEdit && !isManager) return { ok: false, error: t('common.notAuthorized') };
    try {
      if (field === 'managerUserId') {
        if (!canEdit) return { ok: false, error: t('common.notAuthorized') };
        const managerUserId = nextValue === '' ? null : Number(nextValue);
        const response = await axios.put(`/api/admin/projects/${editProject.id}/manager`, { managerUserId });
        const assigned = response.data.manager;
        const nextProject = {
          ...editProject,
          manager_user_id: assigned?.id || null,
          managerUserId: assigned?.id || null,
          originalManagerUserId: assigned?.id || null,
          manager_name: assigned?.name || '',
          manager_surname: assigned?.surname || '',
        };
        setEditProject(nextProject);
        setProjects((items) => items.map((item) => item.id === nextProject.id ? { ...item, ...nextProject } : item));
        if (response.data.emailDelivery === 'failed') setNotice(t('projects.manager.emailFailed'));
        await loadEditBudgetData();
        return { ok: true };
      }

      const candidate = { ...editProject, [field]: nextValue };
      const validation = validateProjectForm(candidate, editProject.id);
      const errorField = field === 'client_id' ? 'client' : field;
      if (validation[errorField]) return { ok: false, error: validation[errorField] };

      const response = await axios.patch(`/api/projects/${editProject.id}`, { [field]: nextValue });
      const updated = response.data;
      const nextProject = {
        ...editProject,
        ...updated,
        managerUserId: updated.manager_user_id || editProject.managerUserId || null,
        originalManagerUserId: updated.manager_user_id || editProject.originalManagerUserId || null,
      };
      setEditProject(nextProject);
      setProjects((items) => items.map((item) => item.id === nextProject.id ? { ...item, ...nextProject } : item));
      return { ok: true };
    } catch (saveError) {
      return { ok: false, error: getApiErrorMessage(saveError, t, 'projects.errors.update') };
    }
  };

  const handleInlineActiveChange = async (nextActive) => {
    const previousActive = Boolean(editProject?.active);
    setActiveSaving(true);
    setEditProject((current) => current ? { ...current, active: nextActive ? 1 : 0 } : current);
    const result = await handleInlineProjectSave('active', nextActive);
    if (!result.ok) {
      setEditProject((current) => current ? { ...current, active: previousActive ? 1 : 0 } : current);
      setError(result.error);
    }
    setActiveSaving(false);
  };

  const cancelEditBudgetSettings = () => {
    if (editBudgetDirty) {
      setConfirmNavigation({ dialog: 'edit', kind: 'cancel-budget' });
      return;
    }
    setEditBudgetPreviewDraft(null);
    setEditBudgetEditing(false);
  };

  const switchEditView = (nextMode) => {
    if (nextMode === editViewMode) return;
    if (nextMode === 'hours' && editBudgetDirty) {
      setConfirmNavigation({ dialog: 'edit', kind: 'switch-hours' });
      return;
    }
    setEditViewMode(nextMode);
    if (nextMode === 'hours') setEditHoursActivated(true);
  };

  const handleEditViewKeyDown = (event, currentMode) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const nextMode = currentMode === 'budget' ? 'hours' : 'budget';
    editViewButtonRefs.current[nextMode]?.focus();
    switchEditView(nextMode);
  };

  const completePendingNavigation = (navigation) => {
    setConfirmNavigation(null);
    if (!navigation) return;
    if (navigation.dialog === 'edit') {
      if (navigation.kind === 'close-budget') forceEditClose();
      else {
        setEditBudgetEditing(false);
        if (navigation.kind === 'switch-hours') {
          setEditViewMode('hours');
          setEditHoursActivated(true);
        }
      }
    } else if (navigation.kind === 'close') {
      forceCreateClose();
    } else {
      setCreateBudgetEditing(false);
    }
  };

  const saveAndContinueNavigation = async () => {
    const navigation = confirmNavigation;
    if (!navigation) return;
    const saved = navigation.dialog === 'create' ? await handleSubmit() : false;
    if (saved) completePendingNavigation(navigation);
  };

  const discardAndContinueNavigation = () => {
    const navigation = confirmNavigation;
    if (!navigation) return;
    if (navigation.dialog === 'create') {
      setNewProject({ name: '', description: '', client_id: '', code: '', category: '', managerUserId: null });
      setNewProjectBudget(emptyBudgetDraft());
      setNewProjectBudgetPreview(emptyBudgetDraft());
      setNewProjectBudgetReason('');
    } else {
      budgetSectionRef.current?.discard();
      setEditBudgetPreviewDraft(null);
    }
    completePendingNavigation(navigation);
  };

  const saveEditBudgetAndReturn = async () => {
    const saved = await budgetSectionRef.current?.save();
    if (saved) {
      setEditBudgetPreviewDraft(null);
      setEditBudgetMeta((current) => ({ ...current, loading: false }));
      setEditBudgetEditing(false);
    }
    return saved;
  };

  const handleDeleteProject = (project) => {
    if (!canEdit) return;
    setProjectActionsAnchorEl(null);
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deletingProject) return;
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete || deletingProject) return;
    setDeletingProject(true);
    try {
      // Delete all time entries for this project
      await axios.delete(`/api/time-entries/by-project/${projectToDelete.id}`);
      // Delete the project itself
      await axios.delete(`/api/projects/${projectToDelete.id}`);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      setProjects((items) => items.filter((item) => Number(item.id) !== Number(projectToDelete.id)));
      forceEditClose();
    } catch (error) {
      setError(t('projects.errors.delete'));
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } finally {
      setDeletingProject(false);
    }
  };

  const activeCategoryFilters = Object.entries(filters)
    .filter(([key, enabled]) => enabled && !['scope', 'active', 'closed', 'requiresDecision'].includes(key))
    .map(([key]) => key);
  const pendingBudgetProjectIds = new Set(pendingBudgetRequests.map((request) => Number(request.projectId)));

  const filteredProjects = projects.filter(project => {
    if (filters.scope === 'mine' && !project.is_my_project) return false;
    if (filters.scope === 'managed' && Number(project.manager_user_id) !== Number(currentUser?.id)) return false;
    if (filters.requiresDecision && !pendingBudgetProjectIds.has(Number(project.id))) return false;
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
      shortLabel: t(`projects.filters.shortCategories.${category.value}`),
      tooltip: t(`projects.filters.tooltips.${category.value}`),
    })),
    {
      key: PROJECT_CATEGORY_TRANSITION.value,
      label: unclassifiedFilterLabel,
      shortLabel: t('projects.filters.shortCategories.unclassified'),
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
    || filters.requiresDecision
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
      requiresDecision: false,
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
      subtitle={t('projects.catalogCount', { count: projects.length })}
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
              {canEdit ? (
                <Tooltip title={t('projects.filters.tooltips.requiresDecision')} arrow>
                  <Chip
                    label={`${t('projects.filters.requiresDecision')} · ${pendingBudgetRequests.length}`}
                    clickable
                    onClick={() => setFilters((currentFilters) => ({ ...currentFilters, requiresDecision: !currentFilters.requiresDecision }))}
                    sx={{
                      ...pageFilterChipSx,
                      flexShrink: 0,
                      ...(filters.requiresDecision
                        ? { background: '#FCF0EB', color: '#C95425', border: '1px solid #E77142' }
                        : { background: '#F5F7FA', color: '#90A0B7', border: 'none' }),
                    }}
                  />
                </Tooltip>
              ) : null}
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
                {t('projects.filters.reset')}
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
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={8000}
        onClose={(_event, reason) => { if (reason !== 'clickaway') setNotice(null); }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: { xs: '72px !important', sm: editOpen || open ? '204px !important' : '88px !important' }, maxWidth: 'calc(100vw - 32px)' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setNotice(null)} sx={{ width: '100%', maxWidth: 900, boxShadow: '0 10px 28px rgba(31,58,95,.18)' }}>
          {notice}
        </Alert>
      </Snackbar>

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
                const categoryMeta = getProjectCategoryMeta(project.category);
                const hasPendingBudgetRequest = Boolean(
                  project.has_pending_budget_request
                  || pendingBudgetProjectIds.has(Number(project.id))
                );
                const managerName = project.manager_user_id
                  ? [project.manager_surname, project.manager_name].filter(Boolean).join(' ')
                  : t('projects.manager.unassigned');
                const projectClient = clients.find((client) => client.id === project.client_id);
                const clientName = `${getClientName(project.client_id)}${
                  projectClient?.type ? ` (${projectClient.type.charAt(0).toUpperCase() + projectClient.type.slice(1)})` : ''
                }`;
                const description = project.description?.trim() || t('projects.noDescription');
                return (
                  <Grid item xs={12} sm={6} md={4} key={project.id} sx={{ display: 'flex' }}>
                    <Card
                      role="button"
                      tabIndex={0}
                      aria-label={t('projects.dialog.openProject', { name: project.name })}
                      onClick={() => handleEditOpen(project, hasPendingBudgetRequest ? 'budget' : 'project')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleEditOpen(project, hasPendingBudgetRequest ? 'budget' : 'project');
                        }
                      }}
                      sx={{
                        ...projectCardSurfaceSx,
                        width: '100%',
                        height: 190,
                        cursor: 'pointer',
                      }}
                    >
                      <CardContent sx={{ p: 1.5, pb: '12px !important', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                          <Tooltip title={project.name} placement="top" arrow>
                            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 600, fontSize: 17, pr: 1, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {project.name}
                            </Typography>
                          </Tooltip>
                          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                            {hasPendingBudgetRequest ? (
                              <Tooltip title={t('projects.budget.pendingApprovalIndicator')} arrow>
                                <Chip
                                  size="small"
                                  label="1"
                                  aria-label={t('projects.budget.pendingApprovalIndicator')}
                                  sx={{ minWidth: 24, height: 22, background: '#FCF0EB', color: '#C95425', fontWeight: 700 }}
                                />
                              </Tooltip>
                            ) : null}
                            <Typography sx={getProjectStatusLabelSx(project.active)}>
                              {project.active ? t('projects.activeStatus') : t('projects.closedStatus')}
                            </Typography>
                          </Stack>
                        </Box>
                        <Tooltip title={project.code || t('projects.noCode')} placement="top" arrow>
                          <Typography variant="caption" sx={{ color: '#5673DC', fontWeight: 500, fontSize: 13, mb: 0.25, display: 'block', textAlign: 'left', mt: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t('projects.code')}: {project.code || t('projects.noCode')}
                          </Typography>
                        </Tooltip>
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
                        <Tooltip title={`${t('projects.client')}: ${clientName}`} placement="top" arrow>
                          <Typography color="text.secondary" variant="body2" sx={{ mb: 0.25, fontSize: 13, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t('projects.client')}: {clientName}
                          </Typography>
                        </Tooltip>
                        <Tooltip title={`${t('projects.manager.label')}: ${managerName}`} placement="top" arrow>
                          <Typography color="text.secondary" variant="body2" sx={{ mb: 0.25, fontSize: 13, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {t('projects.manager.label')}: {managerName}
                          </Typography>
                        </Tooltip>
                        <Tooltip title={description} placement="top" arrow>
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            sx={{
                              fontSize: 13,
                              lineHeight: 1.3,
                              mt: 'auto',
                              minHeight: '2.6em',
                              display: '-webkit-box',
                              WebkitBoxOrient: 'vertical',
                              WebkitLineClamp: 2,
                              overflow: 'hidden',
                            }}
                          >
                            {description}
                          </Typography>
                        </Tooltip>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        ))}
      </Box>

      <ProjectDialogLayout
        open={open}
        onClose={handleClose}
        title={t('projects.dialog.newTitle')}
        subtitle={t('projects.dialog.newSubtitle')}
        chips={newProject.category ? [{ key: 'category', label: PROJECT_CATEGORY_OPTIONS.find((item) => item.value === newProject.category)?.label, sx: getCategoryChipStyles(newProject.category) }] : []}
        secondaryLabel={t('common.actions.cancel')}
        onSecondary={handleClose}
        primaryLabel={t('projects.dialog.create')}
        onPrimary={handleSubmit}
        primaryDisabled={saving}
        primaryVisible
        closeDisabled={saving}
      >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(400px, 38%) minmax(0, 62%)' }, gap: 1.5, alignItems: 'stretch', minWidth: 0, height: { lg: '100%' } }}>
              <ProjectDetailsForm
                value={newProject}
                onChange={setNewProject}
                canEdit
                clients={clients}
                managerCandidates={managerCandidates}
                categoryOptions={PROJECT_CATEGORY_OPTIONS}
                errors={formErrors}
                labels={{
                  sectionTitle: t('projects.dialog.projectDataTitle'),
                  category: categoryFieldLabel,
                  client: t('projects.client'),
                  name: t('projects.projectName'),
                  code: t('projects.projectCode'),
                  manager: t('projects.manager.label'),
                  unassigned: t('projects.manager.unassigned'),
                  description: t('projects.description'),
                }}
              />
              <ProjectBudgetOverview
                previewDraft={newProjectBudgetPreview}
                previewKind={createBudgetEditing ? 'preview' : null}
                previewError={createBudgetEditing && Object.keys(validateBudgetDraft(newProjectBudget, true)).length > 0}
                editing={createBudgetEditing}
                onSettings={() => setCreateBudgetEditing(true)}
                onCancel={() => setCreateBudgetEditing(false)}
                cancelLabel={t('projects.budget.overview.backToOverview')}
                applyVisible={false}
                settingsContent={(
                  <ProjectBudgetSection
                    isAdmin
                    creationDraft={newProjectBudget}
                    onCreationDraftChange={handleCreateBudgetChange}
                    creationReason={newProjectBudgetReason}
                    onCreationReasonChange={setNewProjectBudgetReason}
                    validationVisible={Boolean(error)}
                  />
                )}
              />
            </Box>
      </ProjectDialogLayout>

      <ProjectDialogLayout
        open={editOpen}
        onClose={handleEditClose}
        title={editProject?.name || t('projects.editProject')}
        subtitle={[
          editProject?.code ? `${t('projects.code')}: ${editProject.code}` : null,
          editProject?.client_id ? getClientName(editProject.client_id) : null,
          editProject?.manager_user_id ? [editProject.manager_surname, editProject.manager_name].filter(Boolean).join(' ') : t('projects.manager.unassigned'),
        ].filter(Boolean).join(' · ')}
        chips={[
          editProject?.category ? { key: 'category', label: getProjectCategoryMeta(editProject.category).label, sx: getCategoryChipStyles(editProject.category) } : null,
          { key: 'active', label: editProject?.active ? t('projects.activeStatus') : t('projects.closedStatus'), sx: editProject?.active ? { background: '#EEF3FF', color: '#3F5FC8' } : { background: '#F0F1F3', color: '#6F7784' } },
          canViewEditProjectFinance
            ? editBudgetLoading && !editBudgetStatus
              ? null
              : editBudgetStatus?.budget
                ? { key: 'budget', label: t('projects.budget.version', { version: editBudgetStatus.budget.version }), sx: { background: '#EAF6F0', color: '#287A52' } }
                : { key: 'budget-none', label: t('projects.budget.modes.none'), sx: { background: '#F0F1F3', color: '#6F7784' } }
            : null,
          canViewEditProjectFinance && editBudgetStatus?.activeRequest ? {
            key: 'request',
            label: `${t('projects.budget.version', { version: editBudgetStatus.activeRequest.proposedVersionNumber })} · ${t('projects.budget.statuses.pending')}`,
            sx: { background: '#FCF0EB', color: '#E77142' },
          } : null,
        ].filter(Boolean)}
        headerAction={(
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
              role="tablist"
              aria-label={t('projects.hoursOverview.viewSelector')}
              sx={{
                width: { xs: 178, sm: 196 },
                height: 36,
                p: '3px',
                display: 'flex',
                alignItems: 'stretch',
                borderRadius: 999,
                background: '#F1F2F4',
              }}
            >
              {['budget', 'hours'].map((mode) => (
                <ToggleButton
                  key={mode}
                  ref={(node) => { editViewButtonRefs.current[mode] = node; }}
                  value={mode}
                  selected={editViewMode === mode}
                  role="tab"
                  aria-selected={editViewMode === mode}
                  aria-controls={`project-${mode}-panel`}
                  onClick={() => switchEditView(mode)}
                  onKeyDown={(event) => handleEditViewKeyDown(event, mode)}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    height: 30,
                    px: 1,
                    border: '0 !important',
                    borderRadius: '999px !important',
                    color: '#566071',
                    fontSize: { xs: 11.5, sm: 12 },
                    fontWeight: 500,
                    lineHeight: 1,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    '&.Mui-selected': {
                      color: '#1D2433',
                      background: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(31,42,68,.12)',
                      fontWeight: 700,
                    },
                    '&.Mui-selected:hover': { background: '#FFFFFF' },
                    '&:hover': { background: 'rgba(255,255,255,.55)' },
                    '&.Mui-focusVisible': { outline: '3px solid rgba(86,115,220,.20)', outlineOffset: 1 },
                  }}
                >
                  {mode === 'budget' ? t('projects.budget.title') : t('projects.hoursOverview.modeHours')}
                </ToggleButton>
              ))}
            </Box>
            {canEdit || isEditProjectManager ? (
              <Tooltip title={t('projects.moreActions')} arrow>
                <span>
                  <IconButton
                    aria-label={t('projects.moreActions')}
                    disabled={activeSaving || deletingProject}
                    onClick={(event) => setProjectActionsAnchorEl(event.currentTarget)}
                    sx={{ color: '#7D8797', background: '#F5F7FA', '&:hover': { background: '#E9EDF5' } }}
                  >
                    {activeSaving ? <CircularProgress size={20} /> : <MoreVertIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Stack>
        )}
        secondaryLabel={t('common.actions.cancel')}
        onSecondary={handleEditClose}
        primaryLabel={t('projects.dialog.saveProject')}
        onPrimary={() => {}}
        actionsVisible={false}
        closeDisabled={activeSaving || deletingProject || editBudgetMeta.loading}
      >
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {editProject ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(400px, 38%) minmax(0, 62%)' }, gap: 1.5, alignItems: 'stretch', minWidth: 0, height: { lg: '100%' } }}>
              <ProjectDetailsForm
                ref={detailsFormRef}
                value={editProject}
                onChange={setEditProject}
                canEdit={canEdit || isEditProjectManager}
                canEditManager={canEdit}
                inline
                onSaveField={handleInlineProjectSave}
                clients={clients}
                managerCandidates={managerCandidates}
                categoryOptions={PROJECT_CATEGORY_OPTIONS}
                errors={formErrors}
                currentManagerName={[editProject.manager_surname, editProject.manager_name].filter(Boolean).join(' ')}
                labels={{
                  sectionTitle: t('projects.dialog.projectDataTitle'),
                  category: categoryFieldLabel,
                  client: t('projects.client'),
                  name: t('projects.projectName'),
                  code: t('projects.projectCode'),
                  manager: t('projects.manager.label'),
                  unassigned: t('projects.manager.unassigned'),
                  description: t('projects.description'),
                  retry: t('common.actions.retry'),
                  revert: t('common.actions.revert'),
                  saving: t('projects.inline.saving'),
                  saved: t('projects.inline.saved'),
                }}
              />
              <Box sx={{ minWidth: 0, minHeight: 0, height: { lg: '100%' } }}>
                {editViewMode === 'budget' ? (
                  <Box id="project-budget-panel" role="tabpanel" sx={{ height: '100%', minWidth: 0 }}>
                    {canViewEditProjectFinance ? <ProjectBudgetOverview
                      status={editBudgetStatus}
                      loading={editBudgetLoading}
                      error={editBudgetLoadError}
                      previewDraft={editBudgetEditing ? editBudgetPreviewDraft : null}
                      previewKind={editBudgetEditing ? (editBudgetStatus?.activeRequest ? 'proposal' : 'preview') : null}
                      previewError={editBudgetEditing && Boolean(editBudgetMeta.hasErrors)}
                      editing={editBudgetEditing}
                      onSettings={() => {
                        setEditBudgetPreviewDraft(null);
                        setEditBudgetEditing(true);
                      }}
                      onCancel={cancelEditBudgetSettings}
                      onApply={saveEditBudgetAndReturn}
                      cancelLabel={editBudgetStatus?.activeRequest ? t('projects.budget.overview.backToOverview') : t('common.actions.cancel')}
                      applyLabel={
                        editBudgetMeta.action === 'updateRequest'
                          ? t('projects.budget.updateRequest')
                          : editBudgetMeta.action === 'request'
                            ? t('projects.budget.request')
                            : t('projects.budget.saveParameters')
                      }
                      applyDisabled={editBudgetMeta.primaryDisabled || !editBudgetMeta.primaryVisible}
                      applyVisible={editBudgetMeta.primaryVisible}
                      isAdmin={canEdit}
                      isManager={!canEdit && isEditProjectManager}
                      settingsContent={(
                        <ProjectBudgetSection
                          ref={budgetSectionRef}
                          projectId={editProject.id}
                          isAdmin={canEdit}
                          isManager={!canEdit && isEditProjectManager}
                          onDirtyChange={setEditBudgetDirty}
                          onMetaChange={setEditBudgetMeta}
                          onPreviewDraftChange={setEditBudgetPreviewDraft}
                          status={editBudgetStatus}
                          history={editBudgetHistory}
                          loading={editBudgetLoading}
                          loadError={editBudgetLoadError}
                          reload={loadEditBudgetData}
                          focusedRequestId={deepLinkTargetsEditProject ? focusedBudgetRequestId : null}
                          focusedNotificationId={deepLinkTargetsEditProject ? focusedBudgetNotificationId : null}
                          initialView={deepLinkTargetsEditProject ? initialBudgetView : null}
                          onResultAcknowledged={() => navigate('/projects', { replace: true })}
                          onCompleted={() => {
                            setEditBudgetPreviewDraft(null);
                            setEditBudgetMeta((current) => ({ ...current, loading: false }));
                            setEditBudgetEditing(false);
                          }}
                        />
                      )}
                    /> : <ProjectBudgetOverview restricted />}
                  </Box>
                ) : null}
                {editHoursActivated ? (
                  <Box
                    id="project-hours-panel"
                    role="tabpanel"
                    hidden={editViewMode !== 'hours'}
                    sx={{ height: '100%', minWidth: 0, display: editViewMode === 'hours' ? 'block' : 'none' }}
                  >
                    <ProjectHoursOverview project={editProject} active={editViewMode === 'hours'} />
                  </Box>
                ) : null}
              </Box>
            </Box>
          ) : null}
      </ProjectDialogLayout>

      <Menu
        anchorEl={projectActionsAnchorEl}
        open={Boolean(projectActionsAnchorEl)}
        onClose={() => setProjectActionsAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          elevation: 0,
          sx: {
            mt: 0.75,
            minWidth: 188,
            maxWidth: 240,
            p: 0.5,
            overflow: 'visible',
            background: 'rgba(255,255,255,0.98)',
            border: '1px solid rgba(214,222,240,0.95)',
            borderRadius: '14px',
            boxShadow: '0 12px 28px rgba(90,112,184,0.14)',
          },
        }}
        MenuListProps={{
          dense: true,
          sx: { p: 0 },
        }}
      >
        {canEdit || isEditProjectManager ? (
          <MenuItem
            disabled={!editProject || activeSaving || deletingProject}
            onClick={() => {
              setProjectActionsAnchorEl(null);
              handleInlineActiveChange(!editProject?.active);
            }}
            sx={{
              minHeight: 34,
              px: 1,
              py: 0.5,
              gap: 0.75,
              borderRadius: '9px',
              fontSize: 13.5,
              color: '#2D3748',
              '&:hover': { background: '#F4F6FC' },
              '&:focus-visible': {
                background: '#F4F6FC',
                outline: '2px solid rgba(86,115,220,0.28)',
                outlineOffset: '-2px',
              },
            }}
          >
            {editProject?.active
              ? <PauseCircleOutlineIcon sx={{ color: '#657083', fontSize: 18 }} />
              : <PlayCircleOutlineIcon sx={{ color: '#287A52', fontSize: 18 }} />}
            {editProject?.active ? t('projects.closeProject') : t('projects.activateProject')}
          </MenuItem>
        ) : null}
        {canEdit ? <Divider sx={{ my: 0.5, borderColor: 'rgba(214,222,240,0.8)' }} /> : null}
        {canEdit ? <MenuItem
          disabled={!canEdit || deletingProject}
          onClick={() => handleDeleteProject(editProject)}
          sx={{
            minHeight: 34,
            px: 1,
            py: 0.5,
            gap: 0.75,
            borderRadius: '9px',
            fontSize: 13.5,
            color: '#C43D36',
            '&:hover': { background: '#FFF3F1' },
            '&:focus-visible': {
              background: '#FFF3F1',
              outline: '2px solid rgba(196,61,54,0.24)',
              outlineOffset: '-2px',
            },
          }}
        >
          <DeleteIcon sx={{ fontSize: 18 }} />
          {t('projects.deleteProject')}
        </MenuItem> : null}
      </Menu>

      <Dialog open={Boolean(confirmNavigation)} onClose={() => setConfirmNavigation(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{confirmNavigation?.dialog === 'edit' ? t('projects.dialog.unsavedBudgetTitle') : t('projects.dialog.unsavedTitle')}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {confirmNavigation?.kind === 'switch-hours'
              ? t('projects.hoursOverview.unsavedSwitchMessage')
              : confirmNavigation?.dialog === 'edit'
                ? t('projects.dialog.unsavedBudgetMessage')
                : t('projects.dialog.unsavedMessage')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: 'wrap' }}>
          <Button onClick={() => setConfirmNavigation(null)} sx={{ textTransform: 'none' }}>{t('projects.dialog.stay')}</Button>
          <Button onClick={discardAndContinueNavigation} color="inherit" variant="outlined" sx={{ textTransform: 'none' }}>
            {confirmNavigation?.kind === 'switch-hours'
              ? t('projects.hoursOverview.discardAndSwitch')
              : confirmNavigation?.kind === 'close-budget'
                ? t('projects.dialog.closeWithoutSaving')
                : confirmNavigation?.dialog === 'edit'
                  ? t('projects.dialog.discardBudget')
                  : t('projects.dialog.discard')}
          </Button>
          {confirmNavigation?.dialog === 'create' ? (
            <Button onClick={saveAndContinueNavigation} variant="contained" disabled={saving || editBudgetMeta.loading} sx={{ background: '#5673DC', textTransform: 'none' }}>{t('projects.dialog.saveAndContinue')}</Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={deletingProject ? undefined : closeDeleteDialog}>
        <DialogTitle>{t('projects.deleteProject')}</DialogTitle>
        <DialogContent>
          <Typography>{t('projects.confirmDelete', { name: projectToDelete?.name })}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog}
            disabled={deletingProject}
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
            disabled={deletingProject}
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
            {deletingProject ? <CircularProgress size={18} color="inherit" /> : t('projects.deleteProject')}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
}

export default Projects;

