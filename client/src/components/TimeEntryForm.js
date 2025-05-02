import React from 'react';
import { TextField, MenuItem, Button, DialogContent, DialogActions, Box } from '@mui/material';

function TimeEntryForm({ entry, projects, users, error, onChange, onSubmit, onCancel, submitLabel }) {
  return (
    <>
      <DialogContent>
        <TextField
          select
          fullWidth
          margin="dense"
          label="Project"
          value={entry.project_id}
          onChange={e => onChange({ ...entry, project_id: e.target.value })}
          error={!!error && !entry.project_id}
          helperText={!entry.project_id ? 'Please select a project' : ''}
        >
          {projects.map(project => (
            <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          margin="dense"
          label="User"
          value={entry.user_id}
          onChange={e => onChange({ ...entry, user_id: e.target.value })}
          error={!!error && !entry.user_id}
          helperText={!entry.user_id ? 'Please select a user' : ''}
        >
          {users.map(user => (
            <MenuItem key={user.id} value={user.id}>{user.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          fullWidth
          margin="dense"
          label="Start Time"
          type="datetime-local"
          value={entry.start_time}
          onChange={e => onChange({ ...entry, start_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          error={!!error && !entry.start_time}
          helperText={!entry.start_time ? 'Start time is required' : ''}
        />
        <TextField
          fullWidth
          margin="dense"
          label="End Time"
          type="datetime-local"
          value={entry.end_time}
          onChange={e => onChange({ ...entry, end_time: e.target.value })}
          InputLabelProps={{ shrink: true }}
          error={!!error && !entry.end_time}
          helperText={!entry.end_time ? 'End time is required' : ''}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Description"
          multiline
          rows={4}
          value={entry.description}
          onChange={e => onChange({ ...entry, description: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onSubmit} variant="contained" color="primary">
          {submitLabel}
        </Button>
      </DialogActions>
    </>
  );
}

export default TimeEntryForm; 