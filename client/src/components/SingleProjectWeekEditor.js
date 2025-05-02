import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, MenuItem, Button, DialogActions, Typography, IconButton } from '@mui/material';
import { Add, Remove } from '@mui/icons-material';
import { format } from 'date-fns';

function HourInput({ value, onChange }) {
  const handleDecrement = () => {
    const newValue = Math.max(0, (parseFloat(value) || 0) - 1);
    onChange(newValue === 0 ? '' : newValue);
  };
  const handleIncrement = () => {
    const newValue = Math.min(24, (parseFloat(value) || 0) + 1);
    onChange(newValue);
  };
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', border: '1px solid #e0e0e0', borderRadius: 2, px: 0.5, py: 0.2, minWidth: 48, justifyContent: 'center', background: '#fff' }}>
      <IconButton size="small" onClick={handleDecrement} sx={{ p: 0.25 }}>
        <Remove fontSize="small" />
      </IconButton>
      <Typography sx={{ mx: 0.5, minWidth: 16, textAlign: 'center', fontWeight: 500, fontSize: 14 }}>
        {value || 0}
      </Typography>
      <IconButton size="small" onClick={handleIncrement} sx={{ p: 0.25 }}>
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
}

function SingleProjectWeekEditor({ entry, projects, daysOfWeek, weekStart, onChange, onSave, onCancel, error, loading }) {
  const handleProjectChange = (e) => {
    onChange({ ...entry, project_id: e.target.value });
  };
  const handleHourChange = (dayKey, value) => {
    let newValue = value;
    if (typeof value === 'string') {
      newValue = value.replace(/[^0-9.]/g, '');
    }
    const hours = { ...entry.hours, [dayKey]: newValue };
    onChange({ ...entry, hours });
  };
  const projectTotals = daysOfWeek.reduce((sum, day) => sum + (parseFloat(entry.hours[day.key]) || 0), 0);

  return (
    <Box>
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Project</TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell key={day.key} align="center">
                  <Typography variant="body2">
                    {day.label}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {format(new Date(weekStart.getTime() + i * 86400000), 'dd.MM')}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="center">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ width: '100%', maxWidth: 300 }}>
                <TextField
                  select
                  size="small"
                  value={entry.project_id}
                  onChange={handleProjectChange}
                  fullWidth
                >
                  {projects.map(project => (
                    <MenuItem key={project.id} value={project.id}>{project.name}</MenuItem>
                  ))}
                </TextField>
              </TableCell>
              {daysOfWeek.map((day, i) => (
                <TableCell
                  key={day.key}
                  align="center"
                  sx={{ backgroundColor: (day.key === 'sat' || day.key === 'sun') ? '#f5f5f5' : undefined, minWidth: 56, px: 0.5, py: 0.5 }}
                >
                  <HourInput
                    value={entry.hours[day.key] || ''}
                    onChange={val => handleHourChange(day.key, val)}
                  />
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold', minWidth: 40, maxWidth: 56, px: 0.5, py: 0.5 }}>{projectTotals}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onSave} variant="contained" color="primary" disabled={loading}>
          Save
        </Button>
      </DialogActions>
    </Box>
  );
}

export default SingleProjectWeekEditor; 