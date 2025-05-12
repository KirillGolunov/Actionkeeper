import React from 'react';
import { Box, Button, Typography, IconButton } from '@mui/material';
import { LeftArrow, RightArrow } from './ArrowIcons';
import { format } from 'date-fns';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function WeekSelector({ weekStart, onChange, minDate, maxDate }) {
  const monday = getMonday(weekStart);
  const sunday = addDays(monday, 6);

  // Determine if the selected week is the current week
  const todayMonday = getMonday(new Date());
  const isCurrentWeek = monday.toDateString() === todayMonday.toDateString();

  const handlePrev = () => {
    const prevMonday = addDays(monday, -7);
    if (!minDate || prevMonday >= minDate) {
      onChange(prevMonday);
    }
  };

  const handleNext = () => {
    const nextMonday = addDays(monday, 7);
    if (!maxDate || nextMonday <= maxDate) {
      onChange(nextMonday);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <IconButton onClick={handlePrev}>
        <LeftArrow color="#5673DC" size={32} />
      </IconButton>
      <Typography variant="subtitle1" sx={{ minWidth: 180, textAlign: 'center' }}>
        {format(monday, 'dd.MM.yyyy')} - {format(sunday, 'dd.MM.yyyy')}
      </Typography>
      <IconButton onClick={handleNext} disabled={isCurrentWeek}>
        <RightArrow color={isCurrentWeek ? '#C5C9D3' : '#5673DC'} size={32} />
      </IconButton>
    </Box>
  );
} 