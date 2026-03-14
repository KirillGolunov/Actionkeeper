import React from 'react';
import { TextField, MenuItem, Button, DialogContent, DialogActions } from '@mui/material';
import { useTranslation } from '../i18n/I18nProvider';

function TimeEntryForm({ entry, projects, users, error, onChange, onSubmit, onCancel, submitLabel }) {
  const { t } = useTranslation();
  return (
    <>
      <DialogContent>
        <TextField
          select
          fullWidth
          margin="dense"
          label={t('timeEntries.project')}
          value={entry.project_id}
          onChange={e => onChange({ ...entry, project_id: e.target.value })}
          error={!!error && !entry.project_id}
          helperText={!entry.project_id ? t('timeEntries.validation.projectRequired') : ''}
        >
          {projects.map(project => (
            <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          margin="dense"
          label={t('timeEntries.user')}
          value={entry.user_id}
          onChange={e => onChange({ ...entry, user_id: e.target.value })}
          error={!!error && !entry.user_id}
          helperText={!entry.user_id ? t('timeEntries.validation.userRequired') : ''}
        >
          {users.map(user => (
            <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          margin="dense"
          label={t('timeEntries.startTime') || 'Start Time'}
          type="datetime-local"
          value={entry.start_time}
          onChange={e => onChange({ ...entry, start_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          error={!!error && !entry.start_time}
          helperText={!entry.start_time ? (t('timeEntries.startTimeRequired') || 'Start time is required') : ''}
        />
        <TextField
          fullWidth
          margin="dense"
          label={t('timeEntries.endTime') || 'End Time'}
          type="datetime-local"
          value={entry.end_time}
          onChange={e => onChange({ ...entry, end_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          error={!!error && !entry.end_time}
          helperText={!entry.end_time ? (t('timeEntries.endTimeRequired') || 'End time is required') : ''}
        />
        <TextField
          fullWidth
          margin="dense"
          label={t('projects.description')}
          multiline
          rows={4}
          value={entry.description}
          onChange={e => onChange({ ...entry, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{t('common.actions.cancel')}</Button>
        <Button onClick={onSubmit} variant="contained" color="primary">
          {submitLabel}
        </Button>
      </DialogActions>
    </>
  );
}

export default TimeEntryForm; 