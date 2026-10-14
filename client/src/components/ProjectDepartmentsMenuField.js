import React, { useEffect, useImperativeHandle, useState } from 'react';
import axios from 'axios';
import { Box, Checkbox, CircularProgress, IconButton, Radio, Tooltip, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HistoryIcon from '@mui/icons-material/History';
import DepartmentChips from './DepartmentChips';
import ProjectDialogLayout from './ProjectDialogLayout';
import {formatDateTime} from '../utils/localeFormatting';
import ProductErrorToast from './ProductErrorToast';
import ProjectMenu, { ProjectMenuCheckboxIcon, ProjectMenuRadioIcon, projectMenuFieldSx, projectMenuLabelSx } from './ProjectMenu';
import { normalizeProjectDepartments } from './DepartmentSelect';
import { useTranslation } from '../i18n/I18nProvider';
import { getApiErrorMessage } from '../utils/apiErrorMessage';

const keyOf = ids => [...ids].sort((a,b) => a-b).join(',');
const ProjectDepartmentsMenuField = React.forwardRef(function ProjectDepartmentsMenuField({ value, departments, inline, canEdit, onChange, onSave, onBeforeEdit, onTransferred, validationError }, ref) {
  const { t,locale } = useTranslation();
  const ids = inline ? (value.departments || []).map(d => d.id) : value.departmentIds || [];
  const owner = inline ? value.responsible_department_id : value.responsibleDepartmentId;
  const [draft, setDraft] = useState(ids), [anchor, setAnchor] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(null), [historyOpen, setHistoryOpen] = useState(false), [history, setHistory] = useState([]);
  const currentKey = keyOf(ids);
  useEffect(() => { setDraft(ids); setError(''); }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = keyOf(draft) !== currentKey;
  const cancel = () => { if (saving) return false; setAnchor(null); setDraft(ids); setError(''); return true; };
  const apply = async () => {
    if (saving) return false;
    if (!dirty) { setAnchor(null); return true; }
    if (!draft.length) { setError(t('departments.required')); return false; }
    setSaving(true); setError('');
    try {
      if (inline) { const result = await onSave('departmentIds', draft); if (!result?.ok) throw new Error(result?.error || t('departments.saveFailed')); }
      else onChange({ ...value, departmentIds: draft });
      setAnchor(null);
      return true;
    } catch (e) { setError(e.message || t('departments.saveFailed')); return false; }
    finally { setSaving(false); }
  };
  useImperativeHandle(ref, () => ({ isEditing: () => !!anchor, commit: apply, cancel }));
  const chooseOwner = async d => {
    if (saving) return;
    if (inline) { if (d.id !== owner) { if (dirty && !await apply()) return; setTarget(d); setError(''); } }
    else { const next = normalizeProjectDepartments(departments, draft, [...new Set([...draft, d.id])]); onChange({ ...value, departmentIds: next, responsibleDepartmentId: d.id }); setDraft(next); setAnchor(null); }
  };
  const transfer = async () => {
    setSaving(true); setError('');
    try { const response = await axios.post(`/api/projects/${value.id}/transfer-responsibility`, { departmentId: target.id }); onTransferred(response.data); setTarget(null); setAnchor(null); if (response.data.emailDelivery === 'failed') setError(t('governance.deliveryWarning')); }
    catch (e) { setError(getApiErrorMessage(e, t, 'governance.transferFailed')); }
    finally { setSaving(false); }
  };
  const title = d => d.is_system ? t('departments.unassigned') : (d.short_name || d.name);
  const canTransfer = inline ? value.permissions?.canTransferResponsibility : canEdit;
  const nodes = [
    ...(canTransfer ? [{ id: 'owner', label: t(inline ? 'governance.transfer' : 'governance.owner'), children: departments.map(d => ({ id: d.id, label: title(d), tooltip: d.name, icon: <Radio size="small" checked={owner === d.id} icon={<ProjectMenuRadioIcon />} checkedIcon={<ProjectMenuRadioIcon checked />} sx={{ p: 0 }} tabIndex={-1} disableRipple />, onClick: () => chooseOwner(d), disabled: saving })) }] : []),
    ...(canEdit ? [{ id: 'participants', label: t('projectMenus.participants'), children: departments.map(d => {
      const next = normalizeProjectDepartments(departments, draft, draft.includes(d.id) ? draft.filter(id => id !== d.id) : [...draft, d.id]);
      const protectedOwner = !!owner && !next.includes(owner);
      return { id: d.id, label: title(d), tooltip: protectedOwner ? `${d.name}. ${t('projectMenus.ownerProtected')}` : d.name, icon: <Checkbox size="small" checked={draft.includes(d.id)} icon={<ProjectMenuCheckboxIcon />} checkedIcon={<ProjectMenuCheckboxIcon checked />} sx={{ p: 0 }} tabIndex={-1} disableRipple />, disabled: saving, onClick: () => { if (protectedOwner) { setError(t('projectMenus.ownerProtected')); return; } setDraft(next); setError(''); } };
    }) }] : []),
  ];
  const historyDepartmentName = (item, side) => departments.find(d=>d.id===item[`${side}_department_id`])?.is_system?t('departments.unassigned'):item[`${side}_department_short_name`] || departments.find(d => d.id === item[`${side}_department_id`])?.short_name || item[`${side}_department_name`] || '—';
  const selected = departments.filter(d => ids.includes(d.id)).sort((a,b) => Number(b.id === owner) - Number(a.id === owner));
  return <Box sx={{ minWidth: 0 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography sx={projectMenuLabelSx}>{t('projectMenus.departments')} *</Typography>
    </Box>
    <Box sx={{ ...projectMenuFieldSx, background: inline ? '#F8F9FB' : nodes.length ? '#FFFFFF' : '#F5F6F8', border: '1px solid transparent', '&:hover': nodes.length ? { borderColor: 'rgba(173,188,228,.95)' } : {} }}>
      <Box sx={{ flex: 1, minWidth: 0 }}><DepartmentChips departments={anchor ? departments.filter(d => draft.includes(d.id)).sort((a,b) => Number(b.id === owner) - Number(a.id === owner)) : selected} responsibleId={owner} sx={{ my: 0 }} />{!selected.length && <Typography sx={{ color: '#8290A5', fontSize: 14 }}>{t('departments.choose')}</Typography>}</Box>
      {inline && <Tooltip title={t('governance.history')}><IconButton size="small" aria-label={t('governance.history')} sx={{ p: 0.5 }} onClick={async () => { if (await onBeforeEdit?.('departmentIds') === false) return; setError(''); setHistory([]); setHistoryOpen(true); try { setHistory((await axios.get(`/api/projects/${value.id}/responsibility-history`)).data); } catch(e) { setError(getApiErrorMessage(e,t,'governance.transferFailed')); } }}><HistoryIcon sx={{ fontSize: 18, color: '#8290A5' }} /></IconButton></Tooltip>}
      {nodes.length > 0 && <Tooltip title={t('projectMenus.settings')}><IconButton size="small" aria-label={t('projectMenus.settings')} disabled={saving} onClick={async e => { const element=e.currentTarget; if (await onBeforeEdit?.('departmentIds') === false) return; setDraft(ids); setError(''); setAnchor(element); }}><SettingsOutlinedIcon sx={{ fontSize: 18, color: '#8290A5' }} /></IconButton></Tooltip>}
    </Box>
    {!anchor && !target && !historyOpen && (error || validationError) && <Typography role="alert" sx={{ color: '#C43D36', fontSize: 12 }}>{error || validationError}</Typography>}
    {anchor && <ProjectMenu anchor={anchor} onClose={apply} nodes={nodes} label={t('projectMenus.departments')} footer={id => id === 'participants' ? <Box>{inline && !draft.length && !error && <Typography role="alert" sx={{ fontSize: 12, color: '#C43D36' }}>{t('departments.required')}</Typography>}{saving && <CircularProgress size={16} />}{error && <Typography role="alert" sx={{ fontSize: 12, color: '#C43D36' }}>{error}</Typography>}</Box> : null} />}
    <ProjectDialogLayout compact open={!!target} title={t('governance.transfer')} subtitle={value.name} onClose={() => { if (!saving) setTarget(null); }} closeDisabled={saving} secondaryLabel={t('common.actions.cancel')} onSecondary={() => { if (!saving) setTarget(null); }} primaryLabel={t('governance.transfer')} primaryDisabled={saving} onPrimary={transfer}>
      <Box sx={{ p: 2, border: '1px solid #D6DEF0', borderRadius: '14px', background: '#FFFFFF' }}>
        <Typography sx={{ ...projectMenuLabelSx, mb: 0.75 }}>{t('governance.owner')}</Typography>
        <DepartmentChips departments={target ? [target] : []} responsibleId={target?.id} />
        <Typography sx={{ color: '#7A8699', fontSize: 13, mt: 0.5, mb: 1.5 }}>{target?.name}</Typography>
        <Typography sx={{ color: '#3D4655', fontSize: 14, lineHeight: 1.6 }}>{t('governance.transferExplanation')}</Typography>
        {saving && <CircularProgress size={18} sx={{ mt: 1 }} />}
      </Box>
    </ProjectDialogLayout>
    <ProjectDialogLayout compact open={historyOpen} title={t('governance.history')} subtitle={value.name} onClose={() => setHistoryOpen(false)} secondaryLabel={t('common.actions.close')} onSecondary={() => setHistoryOpen(false)} primaryVisible={false}>
      <Box sx={{ p: 2, border: '1px solid #D6DEF0', borderRadius: '14px', background: '#FFFFFF' }}>
        {!error && !history.length && <Typography sx={{ color: '#7A8699', fontSize: 14 }}>{t('projectMenus.noHistory')}</Typography>}
        {history.map(item => <Box key={item.id} sx={{ py: 1.25, '&:not(:last-child)': { borderBottom: '1px solid #EEF0F4' } }}><Typography sx={{ color: '#1D2433', fontSize: 14 }}>{t('projectMenus.transferredFrom')}: {historyDepartmentName(item, 'from')}</Typography><Typography sx={{ color: '#1D2433', fontSize: 14, mt: 0.5 }}>{t('projectMenus.transferredTo')}: {historyDepartmentName(item, 'to')}</Typography><Typography sx={{ fontSize: 12, color: '#7A8699', mt: 0.5 }}>{[item.actor_surname,item.actor_name].filter(Boolean).join(' ')} · {formatDateTime(item.created_at,locale)}</Typography></Box>)}
      </Box>
    </ProjectDialogLayout>
    <ProductErrorToast message={target || historyOpen ? error : null} onClose={() => setError('')} />
  </Box>;
});
export default ProjectDepartmentsMenuField;
