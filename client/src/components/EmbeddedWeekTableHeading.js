import React from 'react';
import { Box, IconButton, TableCell, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { addDays, format } from 'date-fns';

export default function EmbeddedWeekTableHeading({ weekStart, dateLocale, onWeekChange, projectColumnWidth = 320 }) {
  return (
    <TableCell
      colSpan={2}
      data-testid="embedded-week-table-heading"
      sx={{
        width: projectColumnWidth + 40,
        minWidth: projectColumnWidth + 40,
        maxWidth: projectColumnWidth + 40,
        p: 0,
      }}
    >
      <Box sx={{ minHeight: 76, px: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography component="h2" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: '#1D2433' }}>
            Часы по проектам
          </Typography>
          <Typography noWrap sx={{ fontSize: 11.5, lineHeight: '18px', color: '#7A8496' }}>
            {format(weekStart, 'd MMMM', { locale: dateLocale })} — {format(addDays(weekStart, 6), 'd MMMM', { locale: dateLocale })}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <IconButton size="small" aria-label="Предыдущая неделя" onClick={() => onWeekChange(addDays(weekStart, -7))}>
            <ChevronLeftRoundedIcon />
          </IconButton>
          <IconButton size="small" aria-label="Следующая неделя" onClick={() => onWeekChange(addDays(weekStart, 7))}>
            <ChevronRightRoundedIcon />
          </IconButton>
        </Box>
      </Box>
    </TableCell>
  );
}
