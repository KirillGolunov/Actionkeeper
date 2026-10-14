import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, ListItemText, MenuItem, Select, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DepartmentChips from './DepartmentChips';
import { normalizeProjectDepartments } from './DepartmentSelect';
import { useTranslation } from '../i18n/I18nProvider';
import { projectFieldInteractionSx } from '../utils/projectCardSurface';
const keyOf = ids => [...ids].sort((a, b) => a - b).join(',');

const ProjectDepartmentField = React.forwardRef(function ProjectDepartmentField({ departments = [], value = [], canEdit, inline = false, onChange, onSave, onBeforeEdit, validationError = '' }, ref) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef(null);
  const selectRef = useRef(null);
  const [menuWidth, setMenuWidth] = useState(null);
  const valueKey = keyOf(value);
  const dirty = keyOf(draft) !== valueKey;
  useEffect(() => { setDraft(value); setError(''); }, [valueKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const cancel = useCallback(() => { setDraft(value); setError(''); setOpen(false); return true; }, [value]);
  const commit = useCallback(async () => {
    if (pending.current) return pending.current;
    setOpen(false);
    if (!canEdit) return true;
    if (!draft.length) { setError(t('departments.required')); return false; }
    if (!inline || !dirty) return true;
    setSaving(true); setError('');
    pending.current = (async () => {
      try {
        const result = await onSave('departmentIds', draft);
        if (!result?.ok) { setError(result?.error || t('departments.saveFailed')); return false; }
        return true;
      } catch (_) { setError(t('departments.saveFailed')); return false; }
      finally { setSaving(false); pending.current = null; }
    })();
    return pending.current;
  }, [canEdit, inline, dirty, draft, onSave, t]);
  useImperativeHandle(ref, () => ({ isEditing: () => open || (inline && dirty), commit, cancel }), [open, inline, dirty, commit, cancel]);
  const selected = departments.filter(d => draft.includes(d.id));
  const displayedError = error || (!draft.length ? validationError : '');
  return <Box sx={{ minWidth: 0 }}>
    <Typography component="label" id="project-department-label" sx={{ display: 'block', color: '#7A8699', fontSize: 11.5, lineHeight: 1.15, mb: 0.3, px: 0.5 }}>{t('departments.projectField')} *</Typography>
    {canEdit ? <Select ref={selectRef} multiple fullWidth size="small" labelId="project-department-label" value={draft} open={open} disabled={saving}
      onOpen={async () => { if (await onBeforeEdit?.('departmentIds') === false) return; setMenuWidth(selectRef.current?.getBoundingClientRect().width || null); setOpen(true); }}
      IconComponent={inline && !open ? EditOutlinedIcon : undefined}
      onClose={commit}
      onChange={event => {
        const next = normalizeProjectDepartments(departments, draft, event.target.value);
        setDraft(next); setError(''); if (!inline) onChange(next);
      }}
      displayEmpty renderValue={() => selected.length ? <DepartmentChips departments={selected} sx={{ my: 0 }} /> : <Typography sx={{ fontSize: 14, color: '#7A8699' }}>{t('departments.choose')}</Typography>}
      error={!!displayedError}
      MenuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        PaperProps: { sx: { width: menuWidth || undefined, minWidth: menuWidth || undefined, maxWidth: 'calc(100vw - 32px)', maxHeight: 420, mt: 1, backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #DCE4F1', boxShadow: '0 14px 32px rgba(77, 97, 163, 0.14)', overflowX: 'hidden', overflowY: 'auto', '& .MuiMenu-list': { py: 0.5 } } },
      }}
      sx={{
        ...projectFieldInteractionSx, minHeight: 36, borderRadius: 2, background: '#FFFFFF',
        transition: 'border-color .2s ease, box-shadow .2s ease, background .2s ease',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: displayedError ? '#C43D36' : inline && !open ? 'transparent' : undefined },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: displayedError ? '#C43D36' : 'rgba(173,188,228,0.95)' },
        ...(inline && !open && { '&:hover': { boxShadow: '0 6px 16px rgba(90,112,184,0.08)' } }),
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: displayedError ? '#C43D36' : open || !inline ? '#5673DC' : 'transparent', boxShadow: open || !inline ? '0 0 0 3px rgba(86,115,220,0.12)' : undefined },
        '& .MuiSelect-icon': { color: '#8290A5', fontSize: inline && !open ? 17 : undefined, right: 9 },
        '& .MuiSelect-select': { display: 'flex', alignItems: 'center', minHeight: '24px !important', whiteSpace: 'normal', px: 1.1, pr: 4, py: 0.625 },
      }}>
      {departments.map(d => <MenuItem key={d.id} value={d.id} aria-label={d.is_system ? t('departments.unassigned') : d.name} sx={{ alignItems: 'flex-start', py: 0.75, px: 1.5, mx: 0.75, my: 0.125, minHeight: 48, borderRadius: 2.5, transition: 'background-color 0.15s ease', '&:hover': { backgroundColor: '#F5F8FF' }, '&.Mui-selected': { backgroundColor: '#EEF3FF' }, '&.Mui-selected:hover': { backgroundColor: '#E7EEFF' } }}>
        <Checkbox checked={draft.includes(d.id)} size="small" sx={{ p: 0.5, mr: 0.75, flexShrink: 0 }} tabIndex={-1} disableRipple inputProps={{ 'aria-label': d.is_system ? t('departments.unassigned') : d.name }} />
        <ListItemText sx={{ minWidth: 0, my: 0 }}
          primary={d.is_system ? t('departments.unassigned') : (d.short_name || d.name)}
          secondary={d.is_system ? t('departments.unassigned') : d.name}
          primaryTypographyProps={{ title: d.is_system ? t('departments.unassigned') : (d.short_name || d.name), sx: { fontSize: 13, color: '#273041', fontWeight: 600, lineHeight: 1.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }}
          secondaryTypographyProps={{ title: d.is_system ? t('departments.unassigned') : d.name, sx: { fontSize: 10.5, color: '#8A96AD', lineHeight: 1.35, mt: 0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }} />
      </MenuItem>)}
    </Select> : <Box sx={{ px: 1.1, py: 0.625, minHeight: 36, boxSizing: 'border-box', display: 'flex', alignItems: 'center', borderRadius: 2, background: '#F5F6F8' }}><DepartmentChips departments={selected} sx={{ my: 0 }} /></Box>}
    {saving && <CircularProgress size={16} sx={{ mt: 0.5 }} />}
    {displayedError && <Box role="alert" sx={{ mt: 0.5 }}>
      <Typography sx={{ color: '#C43D36', fontSize: 12 }}>{displayedError}</Typography>
      {inline && <Box sx={{ display: 'flex', gap: 1 }}><Button size="small" onClick={commit}>{t('common.actions.retry')}</Button><Button size="small" onClick={cancel}>{t('common.actions.revert')}</Button></Box>}
    </Box>}
  </Box>;
});
export default ProjectDepartmentField;
