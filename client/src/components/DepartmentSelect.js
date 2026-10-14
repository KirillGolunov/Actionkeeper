import React from 'react';
import { TextField, MenuItem } from '@mui/material';
import DepartmentChips from './DepartmentChips';
import { useTranslation } from '../i18n/I18nProvider';

export function normalizeProjectDepartments(departments, previous, selected) {
  const systemId = departments.find(d => d.is_system)?.id;
  if (!selected.includes(systemId) || selected.length < 2) return selected;
  // Selecting the system department explicitly replaces ordinary departments.
  if (!previous.includes(systemId)) return [systemId];
  return selected.filter(id => id !== systemId);
}

export default function DepartmentSelect({ departments, value, onChange, multiple = false, disabled = false, compact = false, chips = false }) {
  const { t } = useTranslation();
  const label = d => d.is_system ? t('departments.unassigned') : d.name;
  return <TextField select fullWidth required size="small" label={compact ? undefined : t('departments.employeeField')} value={value ?? (multiple ? [] : '')} disabled={disabled}
    onChange={e => onChange(multiple ? normalizeProjectDepartments(departments, value || [], e.target.value) : e.target.value)}
    SelectProps={{ multiple, displayEmpty: compact, inputProps: { 'aria-label': t('departments.employeeField') }, renderValue: selected => {
      const ids = multiple ? selected : [selected];
      const selectedDepartments=ids.filter(id=>id!=='').map(id=>departments.find(d=>d.id===id)).filter(Boolean);
      if(chips&&selectedDepartments.length)return <DepartmentChips departments={selectedDepartments} sx={{my:0}}/>;
      return selectedDepartments.map(label).join(', ') || (compact ? t('departments.employeeField') : '');
    } }}
    sx={{ my: compact ? 0 : 1, minWidth: 0, ...(compact && { background: '#f7f8fa', borderRadius: 2 }), '& .MuiOutlinedInput-root': { minWidth: 0, ...(compact && { fontSize: 14, borderRadius: 2 }) }, '& .MuiSelect-select': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}>
    {!multiple && <MenuItem value="" disabled>{t('departments.employeeField')}</MenuItem>}
    {departments.map(d => <MenuItem key={d.id} value={d.id} sx={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{chips?<DepartmentChips departments={[d]} sx={{my:0}}/>:label(d)}</MenuItem>)}
  </TextField>;
}
