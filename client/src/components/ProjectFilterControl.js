import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, ButtonBase, Typography } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import ProjectMenu, { ProjectMenuCheckboxIcon, ProjectMenuRadioIcon } from './ProjectMenu';
import { useTranslation } from '../i18n/I18nProvider';
import { availableProjectDepartments, defaultProjectFilters, defaultProjectScope } from '../utils/projectFilters';
import { PROJECT_CATEGORY_ORDER } from '../utils/projectCategories';

export default function ProjectFilterControl({ filters, onChange, departments, projects, currentUser, canReview, pendingCount, optionsLoaded = true }) {
  const { t, locale } = useTranslation();
  const [anchor, setAnchor] = useState(null);
  const ref = useRef(null);
  const initialized = useRef(false);
  const dirs = availableProjectDepartments(departments, projects, currentUser);
  const departmentIds = dirs.map(d => d.id).join(',');
  const defaultScope = defaultProjectScope(dirs, currentUser);
  useLayoutEffect(() => {
    if (!optionsLoaded || initialized.current) return;
    initialized.current = true;
    onChange(previous => ({ ...previous, scope: defaultScope }));
  }, [optionsLoaded, defaultScope, onChange]);
  useEffect(() => {
    if (optionsLoaded && initialized.current && filters.scope.startsWith('department:') && !departmentIds.split(',').includes(filters.scope.split(':')[1])) {
      onChange(previous => ({ ...previous, scope: 'all' }));
    }
  }, [departmentIds, filters.scope, onChange, optionsLoaded]);
  const labelForDepartment = d => d.is_system ? t('departments.unassigned') : d.short_name || d.name;
  const selected = dirs.find(d => `department:${d.id}` === filters.scope);
  const fieldLabel = selected ? labelForDepartment(selected) : t(`projectFilters.${filters.scope}`);
  const extraCount = Number(!filters.active || filters.closed) + Number(PROJECT_CATEGORY_ORDER.some(key => filters[key])) + Number(filters.requiresDecision);
  const changed = filters.scope !== defaultScope || extraCount > 0;
  const selectScope = scope => { onChange(previous => ({ ...previous, scope })); setAnchor(null); };
  const radio = (id, label, checked, onClick) => ({ id, label, icon: <ProjectMenuRadioIcon checked={checked} />, onClick });
  const checkbox = (key, label) => ({ id: key, label, keepOpen: true, icon: <ProjectMenuCheckboxIcon checked={!!filters[key]} />, onClick: () => onChange(previous => ({ ...previous, [key]: !previous[key] })) });
  const preferred = d => !d.is_system && (Number(d.id) === Number(currentUser?.department_id) || currentUser?.managedDepartmentIds?.some(id => Number(id) === Number(d.id)));
  const firstOther = dirs.findIndex(d => !preferred(d));
  const departmentNodes = dirs.flatMap((d, index) => [
    ...(index === firstOther && index > 0 ? [{ id: 'department-divider', divider: true }] : []),
    radio(`department:${d.id}`, labelForDepartment(d), filters.scope === `department:${d.id}`, () => selectScope(`department:${d.id}`)),
  ]);
  const nodes = [
    { id: 'departments', label: t('projectFilters.departments'), children: [radio('all', t('projectFilters.all'), filters.scope === 'all', () => selectScope('all')), ...departmentNodes] },
    { id: 'personal', label: t('projectFilters.personal'), children: ['managed', 'participated'].map(scope => radio(scope, t(`projectFilters.${scope}`), filters.scope === scope, () => selectScope(scope))) },
    { id: 'status', label: t('projectFilters.status'), children: [checkbox('active', t('projects.active')), checkbox('closed', t('projects.closed'))] },
    { id: 'categories', label: t('projectFilters.categories'), children: PROJECT_CATEGORY_ORDER.map(key => checkbox(key, t(key === 'unclassified' ? 'projectFilters.unclassified' : `projectCategories.${key}`))) },
    ...(canReview ? [{ id: 'budget', label: t('projectFilters.budget'), children: [
      radio('any-budget', t('projectFilters.all'), !filters.requiresDecision, () => { onChange(previous => ({ ...previous, requiresDecision: false })); setAnchor(null); }),
      radio('pending', t('projectFilters.pending', { count: new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(pendingCount) }), filters.requiresDecision, () => { onChange(previous => ({ ...previous, requiresDecision: true })); setAnchor(null); }),
    ] }] : []),
    { id: 'reset-divider', divider: true },
    { id: 'reset', label: t('projects.filters.reset'), disabled: !changed, sx: { color: '#5673DC', '&.Mui-disabled': { color: '#AEB8CA' }, '&:hover': { color: '#4256B2', background: '#EEF3FF' } }, onClick: () => { onChange({ ...defaultProjectFilters(), scope: defaultScope }); setAnchor(null); } },
  ];
  return <><ButtonBase ref={ref} role="combobox" disabled={!optionsLoaded} aria-label={t('projectFilters.label')} aria-haspopup="menu" aria-expanded={!!anchor} onClick={() => setAnchor(ref.current)} onKeyDown={e => { if (['ArrowDown', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setAnchor(ref.current); } }} sx={{ width: { xs: '100%', sm: 280 }, height: 40, px: 1.5, border: '1px solid #E2E4E9', borderRadius: '8px', background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', minWidth: 0 }}>
    <Typography noWrap sx={{ fontSize: 14, minWidth: 0, flex: 1, textAlign: 'left' }}>{fieldLabel}</Typography>
    {!!extraCount && <Box component="span" aria-label={t('projectFilters.extraCount', { count: extraCount })} sx={{ borderRadius: '6px', px: 0.75, fontSize: 12, color: '#5673DC', bgcolor: '#EEF3FF' }}>{new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(extraCount)}</Box>}
    <KeyboardArrowDownRoundedIcon sx={{ fontSize: 20, color: '#7F899E' }} />
  </ButtonBase>{anchor && <ProjectMenu anchor={anchor} onClose={() => setAnchor(null)} label={t('projectFilters.label')} nodes={nodes} />}</>;
}
