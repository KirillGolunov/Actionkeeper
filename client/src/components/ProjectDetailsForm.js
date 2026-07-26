import React from 'react';
import {
  Autocomplete, Box, Button, CircularProgress, MenuItem, Paper, TextField, Typography,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { projectCardSurfaceSx, projectFieldInteractionSx } from '../utils/projectCardSurface';

function ReadOnlyValue({ label, value, fullWidth = false }) {
  return (
    <Box sx={{ gridColumn: fullWidth ? '1 / -1' : 'auto', minWidth: 0 }}>
      <Typography sx={{ color: '#7A8699', fontSize: 12, mb: 0.4 }}>{label}</Typography>
      <Typography sx={{ color: '#1D2433', fontSize: 14.5, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

const InlineRow = React.forwardRef(function InlineRow({
  field, label, value, displayValue, editable, type = 'text', options = [], required = false, multiline = false, onSave, onBeforeEdit, retryLabel, revertLabel, savingLabel, savedLabel,
}, ref) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value ?? '');
  const [state, setState] = React.useState('idle');
  const [error, setError] = React.useState('');
  const committing = React.useRef(false);
  const pendingCommit = React.useRef(null);
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  const cancel = React.useCallback(() => {
    setDraft(value ?? '');
    setEditing(false);
    setError('');
    setState('idle');
    return true;
  }, [value]);

  const commit = React.useCallback(async (nextValue = draft) => {
    if (!editable) return true;
    if (committing.current) return pendingCommit.current;
    if (String(nextValue ?? '') === String(value ?? '')) {
      setEditing(false); setError(''); setState('idle');
      return true;
    }
    committing.current = true;
    pendingCommit.current = (async () => {
      setState('saving'); setError('');
      const result = await onSave(field, nextValue);
      if (!result?.ok) {
        setState('error'); setError(result?.error || '');
        return false;
      }
      setState('saved'); setEditing(false);
      window.setTimeout(() => setState('idle'), 1600);
      return true;
    })();
    const saved = await pendingCommit.current;
    committing.current = false;
    pendingCommit.current = null;
    return saved;
  }, [draft, editable, field, onSave, value]);

  React.useImperativeHandle(ref, () => ({
    isEditing: () => editing,
    commit,
    cancel,
  }), [editing, commit, cancel]);

  const startEditing = async () => {
    if (!editable) return;
    const allowed = await onBeforeEdit?.(field);
    if (allowed === false) return;
    setDraft(value ?? ''); setEditing(true); setError(''); setState('idle');
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const onKeyDown = async (event) => {
    if (event.key === 'Escape') {
      event.preventDefault(); cancel();
    } else if ((!multiline && event.key === 'Enter') || (multiline && event.key === 'Enter' && event.ctrlKey)) {
      event.preventDefault(); await commit();
    }
  };

  const controlHeight = multiline ? 'auto' : 36;
  const controlMinHeight = multiline ? 58 : 36;
  const inputSx = {
    ...projectFieldInteractionSx,
    '& .MuiOutlinedInput-root': {
      ...projectFieldInteractionSx['& .MuiOutlinedInput-root'],
      height: multiline ? 'auto' : controlHeight,
      minHeight: controlMinHeight,
      alignItems: multiline ? 'flex-start' : 'center',
      p: multiline ? 0 : undefined,
    },
    '& .MuiInputBase-input': {
      boxSizing: 'border-box',
      height: multiline ? undefined : 34,
      minHeight: multiline ? 56 : undefined,
      px: 1.1,
      py: multiline ? 0.75 : 0,
      fontSize: 14,
      lineHeight: 1.45,
      overflow: multiline ? 'hidden !important' : undefined,
    },
  };

  const editControl = type === 'select' ? (
    <TextField
      id={`project-field-${field}`}
      inputRef={inputRef}
      select
      fullWidth
      size="small"
      value={draft ?? ''}
      error={state === 'error'}
      onChange={async (event) => { setDraft(event.target.value); await commit(event.target.value); }}
      onKeyDown={onKeyDown}
      inputProps={{ 'aria-label': label }}
      sx={inputSx}
    >
      {options.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
    </TextField>
  ) : (
    <TextField
      id={`project-field-${field}`}
      inputRef={inputRef}
      fullWidth
      size="small"
      multiline={multiline}
      minRows={multiline ? 2 : undefined}
      value={draft ?? ''}
      error={state === 'error'}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => commit()}
      onKeyDown={onKeyDown}
      inputProps={{ 'aria-label': label }}
      sx={inputSx}
    />
  );

  return (
    <Box sx={{ minWidth: 0, position: 'relative' }}>
      <Typography component="label" htmlFor={`project-field-${field}`} sx={{ display: 'block', color: '#7A8699', fontSize: 11.5, lineHeight: 1.15, mb: 0.3, px: 0.5 }}>
        {label}{required ? ' *' : ''}
      </Typography>
      <Box sx={{ height: controlHeight, minHeight: controlMinHeight }}>
        {editing ? editControl : (
          <Box
            component={editable ? 'button' : 'div'}
            type={editable ? 'button' : undefined}
            onClick={startEditing}
            sx={{
              width: '100%', height: controlHeight, minHeight: controlMinHeight, px: 1.1, py: multiline ? 0.65 : 0, textAlign: 'left',
              border: '1px solid transparent', borderRadius: 2, background: editable ? '#FFFFFF' : '#F5F6F8',
              color: '#1D2433', cursor: editable ? 'text' : 'default', font: 'inherit',
              display: 'flex', alignItems: multiline ? 'flex-start' : 'center',
              transition: 'border-color .2s ease, box-shadow .2s ease, background .2s ease',
              '&:hover': editable ? { borderColor: 'rgba(173,188,228,0.95)', boxShadow: '0 6px 16px rgba(90,112,184,0.08)' } : {},
              '&:focus-visible': { outline: '3px solid rgba(86,115,220,.22)', outlineOffset: 1 },
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: multiline ? 'flex-start' : 'center', gap: 1, width: '100%', minWidth: 0 }}>
              <Typography sx={{ color: editable ? '#1D2433' : '#8A93A2', fontSize: 14, lineHeight: 1.45, whiteSpace: multiline ? 'pre-wrap' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayValue || '—'}
              </Typography>
            {state === 'saving' ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><CircularProgress size={14} /><Typography sx={{ color: '#657083', fontSize: 10.5 }}>{savingLabel}</Typography></Box> : null}
            {state === 'saved' ? <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}><CheckCircleOutlineIcon sx={{ color: '#2E8B57', fontSize: 17 }} /><Typography sx={{ color: '#2E8B57', fontSize: 10.5 }}>{savedLabel}</Typography></Box> : null}
            {state === 'error' ? <ErrorOutlineIcon sx={{ color: '#C43D36', fontSize: 18 }} /> : null}
            {editable && state === 'idle' ? <EditOutlinedIcon sx={{ color: '#8290A5', fontSize: 17 }} /> : null}
            </Box>
          </Box>
        )}
      </Box>
      {error ? (
        <Box sx={{ position: 'absolute', zIndex: 5, top: '100%', left: 0, right: 0, display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, px: 0.75, py: 0.4, borderRadius: 1.5, background: '#FFF7F6', border: '1px solid #F0C5C1', boxShadow: '0 8px 18px rgba(90,112,184,0.12)' }}>
          <Typography sx={{ color: '#C43D36', fontSize: 11.5, flex: 1 }}>{error}</Typography>
          <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={() => commit()} sx={{ minWidth: 0, p: 0.25, textTransform: 'none', fontSize: 11.5 }}>{retryLabel}</Button>
          <Button size="small" onMouseDown={(event) => event.preventDefault()} onClick={cancel} color="inherit" sx={{ minWidth: 0, p: 0.25, textTransform: 'none', fontSize: 11.5 }}>{revertLabel}</Button>
        </Box>
      ) : null}
    </Box>
  );
});

const ProjectDetailsForm = React.forwardRef(function ProjectDetailsForm({
  value,
  onChange,
  canEdit,
  inline = false,
  canEditManager = false,
  onSaveField,
  clients,
  managerCandidates,
  categoryOptions,
  labels,
  errors = {},
  currentManagerName = '',
}, ref) {
  const client = clients.find((item) => Number(item.id) === Number(value.client_id));
  const manager = managerCandidates.find((item) => Number(item.id) === Number(value.managerUserId));
  const category = categoryOptions.find((item) => item.value === value.category);

  const inlineRefs = React.useRef({});
  React.useImperativeHandle(ref, () => ({
    commitActive: async () => {
      const active = Object.values(inlineRefs.current).find((item) => item?.isEditing?.());
      return active ? active.commit() : true;
    },
    cancelActive: () => {
      const active = Object.values(inlineRefs.current).find((item) => item?.isEditing?.());
      return active ? active.cancel() : false;
    },
    hasActive: () => Object.values(inlineRefs.current).some((item) => item?.isEditing?.()),
  }), []);

  if (inline) {
    const managerName = manager ? [manager.surname, manager.name].filter(Boolean).join(' ') : currentManagerName || labels.unassigned;
    const rows = [
      { field: 'category', label: labels.category, value: value.category || '', displayValue: category?.label, type: 'select', required: true, options: categoryOptions.map((item) => ({ value: item.value, label: item.label })), editable: canEdit },
      { field: 'client_id', label: labels.client, value: value.client_id || '', displayValue: client?.name, type: 'select', required: true, options: clients.map((item) => ({ value: item.id, label: `${item.name} (${item.type})` })), editable: canEdit },
      { field: 'name', label: labels.name, value: value.name || '', displayValue: value.name, required: true, editable: canEdit },
      { field: 'code', label: labels.code, value: value.code || '', displayValue: value.code, editable: canEdit },
      { field: 'managerUserId', label: labels.manager, value: value.managerUserId || '', displayValue: managerName, type: 'select', options: [{ value: '', label: labels.unassigned }, ...managerCandidates.map((item) => ({ value: item.id, label: `${[item.surname, item.name].filter(Boolean).join(' ')} · ${item.email}` }))], editable: canEditManager },
      { field: 'description', label: labels.description, value: value.description || '', displayValue: value.description, multiline: true, editable: canEdit },
    ];
    const beforeEdit = async (field) => {
      const active = Object.entries(inlineRefs.current).find(([key, item]) => key !== field && item?.isEditing?.());
      return active ? active[1].commit() : true;
    };
    return (
      <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 1.75 }, minWidth: 0, ...projectCardSurfaceSx }}>
        <Typography component="h3" sx={{ color: '#1D2433', fontSize: 17, fontWeight: 600, mb: 1.1 }}>{labels.sectionTitle}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 0.65 }}>
          {rows.map((row) => (
            <InlineRow
              key={row.field}
              ref={(node) => { inlineRefs.current[row.field] = node; }}
              {...row}
              onSave={onSaveField}
              onBeforeEdit={beforeEdit}
              retryLabel={labels.retry}
              revertLabel={labels.revert}
              savingLabel={labels.saving}
              savedLabel={labels.saved}
            />
          ))}
        </Box>
      </Paper>
    );
  }

  if (!canEdit) {
    return (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.5, sm: 2 },
          ...projectCardSurfaceSx,
          minWidth: 0,
        }}
      >
        <Typography component="h3" sx={{ color: '#1D2433', fontSize: 17, fontWeight: 600, mb: 1.25 }}>{labels.sectionTitle}</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 1.15 }}>
          <ReadOnlyValue label={labels.category} value={category?.label} />
          <ReadOnlyValue label={labels.client} value={client?.name} />
          <ReadOnlyValue label={labels.name} value={value.name} />
          <ReadOnlyValue label={labels.code} value={value.code} />
          <ReadOnlyValue
            label={labels.manager}
            value={manager ? [manager.surname, manager.name].filter(Boolean).join(' ') : currentManagerName || labels.unassigned}
            fullWidth
          />
          <ReadOnlyValue label={labels.description} value={value.description} fullWidth />
        </Box>
      </Paper>
    );
  }

  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  const fieldSx = projectFieldInteractionSx;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 1.75 }, minWidth: 0, ...projectCardSurfaceSx }}>
      <Typography component="h3" sx={{ color: '#1D2433', fontSize: 17, fontWeight: 600, mb: 1.25 }}>{labels.sectionTitle}</Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 1.05,
        }}
      >
        <TextField required size="small" select fullWidth label={labels.category} value={value.category || ''} onChange={set('category')} error={!!errors.category} helperText={errors.category || undefined} sx={fieldSx}>
          {categoryOptions.map((item) => <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>)}
        </TextField>
        <TextField required size="small" select fullWidth label={labels.client} value={value.client_id || ''} onChange={set('client_id')} error={!!errors.client} helperText={errors.client || undefined} sx={fieldSx}>
          {clients.map((item) => <MenuItem key={item.id} value={item.id}>{item.name} ({item.type})</MenuItem>)}
        </TextField>
        <TextField required size="small" autoFocus fullWidth label={labels.name} value={value.name || ''} onChange={set('name')} error={!!errors.name} helperText={errors.name || undefined} sx={fieldSx} />
        <TextField size="small" fullWidth label={labels.code} value={value.code || ''} onChange={set('code')} error={!!errors.code} helperText={errors.code || undefined} sx={fieldSx} />
        <Autocomplete
          size="small"
          sx={fieldSx}
          options={managerCandidates}
          value={manager || null}
          onChange={(_event, candidateValue) => onChange({ ...value, managerUserId: candidateValue?.id || null })}
          isOptionEqualToValue={(option, selected) => option.id === selected.id}
          getOptionLabel={(candidate) => `${[candidate.surname, candidate.name].filter(Boolean).join(' ')} · ${candidate.email}`}
          renderInput={(params) => <TextField {...params} label={labels.manager} placeholder={labels.unassigned} />}
        />
        <TextField
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={3}
          label={labels.description}
          value={value.description || ''}
          onChange={set('description')}
          sx={fieldSx}
        />
      </Box>
    </Paper>
  );
});

export default ProjectDetailsForm;
