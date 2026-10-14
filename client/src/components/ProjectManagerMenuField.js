import React, { useImperativeHandle, useState } from 'react';
import { Box, CircularProgress, IconButton, Radio, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ProjectMenu, { ProjectMenuRadioIcon, projectMenuFieldSx, projectMenuLabelSx } from './ProjectMenu';
import { useTranslation } from '../i18n/I18nProvider';

const ProjectManagerMenuField = React.forwardRef(function ProjectManagerMenuField({ value, candidates = [], departments = [], managedDepartmentIds = [], editable, inline, onChange, onSave, onBeforeEdit, label, unassigned, currentName }, ref) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState(null), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const manager = candidates.find(u => Number(u.id) === Number(value));
  const name = u => [u.surname, u.name].filter(Boolean).join(' ');
  const close = () => { if (saving) return; setAnchor(null); setError(''); };
  useImperativeHandle(ref, () => ({ isEditing: () => !!anchor, commit: () => { if (saving) return false; close(); return true; }, cancel: () => { close(); return !saving; } }));
  const select = async id => {
    if (saving) return;
    setError(''); setSaving(true);
    try {
      if (inline) { const result = await onSave('managerUserId', id); if (!result?.ok) throw new Error(result?.error || t('projectMenus.managerFailed')); }
      else onChange(id);
      setAnchor(null);
    } catch(e) { setError(e.message || t('projectMenus.managerFailed')); }
    finally { setSaving(false); }
  };
  const departmentNode = d => ({ id: `dept-${d.id}`, label: d.is_system ? t('departments.unassigned') : (d.short_name || d.name), tooltip: d.name, children: candidates.filter(u => Number(u.department_id) === Number(d.id)).map(u => ({ id: u.id, label: name(u), icon: <Radio checked={Number(value) === Number(u.id)} size="small" icon={<ProjectMenuRadioIcon />} checkedIcon={<ProjectMenuRadioIcon checked />} sx={{ p: 0 }} tabIndex={-1} disableRipple />, onClick: () => select(u.id), disabled: saving })).concat(candidates.some(u => Number(u.department_id) === Number(d.id)) ? [] : [{ id: 'empty', label: t('projectMenus.noEmployees'), disabled: true }]) });
  const nodes = [
    ...departments.filter(d => managedDepartmentIds.includes(d.id)).map(departmentNode),
    { id: 'others', label: t('projectMenus.otherDepartments'), children: departments.filter(d => !managedDepartmentIds.includes(d.id)).sort((a, b) => Number(!!a.is_system) - Number(!!b.is_system)).map(departmentNode) },
    { id: 'no-manager', label: t('projectMenus.noManager'), children: [{ id: 'unassigned', label: unassigned, icon: <Radio checked={!value} size="small" icon={<ProjectMenuRadioIcon />} checkedIcon={<ProjectMenuRadioIcon checked />} sx={{ p: 0 }} tabIndex={-1} disableRipple />, onClick: () => select(null), disabled: saving }] },
  ];
  return <Box sx={{ minWidth: 0 }}>
    <Typography sx={projectMenuLabelSx}>{label}</Typography>
    <Box sx={{ ...projectMenuFieldSx, background: inline ? '#F8F9FB' : editable ? '#FFFFFF' : '#F5F6F8', border: '1px solid transparent', '&:hover': editable ? { borderColor: 'rgba(173,188,228,.95)' } : {} }}>
      <Typography noWrap sx={{ fontSize: 14, flex: 1, color: editable ? '#1D2433' : '#8A93A2' }}>{manager ? name(manager) : currentName || unassigned}</Typography>
      {editable && <IconButton size="small" aria-label={label} disabled={saving} onClick={async e => { const element = e.currentTarget; if (await onBeforeEdit?.('managerUserId') === false) return; setError(''); setAnchor(element); }}><SettingsOutlinedIcon sx={{ fontSize: 18, color: '#8290A5' }} /></IconButton>}
    </Box>
    {anchor && <ProjectMenu anchor={anchor} onClose={close} label={label} nodes={nodes} footer={(_id, depth) => depth === 0 ? <>{saving && <CircularProgress size={16} />}{error && <Typography role="alert" sx={{ fontSize: 12, color: '#C43D36' }}>{error}</Typography>}</> : null} />}
  </Box>;
});
export default ProjectManagerMenuField;
