import React, { useMemo } from 'react';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';

const WEEKDAY_LABELS = ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'];
const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MAIN_50 = '#EBEDFA';
const MAIN_100 = '#D6DCF4';
const MAIN_200 = '#AABAEB';
const MAIN_500 = '#4A68D9';

export const toDateKey = (value) => format(new Date(value), 'yyyy-MM-dd');

export function getCalendarDays(month) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = [];
  for (let date = start; date <= end; date = addDays(date, 1)) days.push(date);
  return days;
}

export function summarizeEntriesByDay(entries = []) {
  return entries.reduce((result, entry) => {
    const key = typeof entry.date === 'string' ? entry.date.slice(0, 10) : toDateKey(entry.date);
    result[key] = Number((Number(result[key] || 0) + Number(entry.hours || 0)).toFixed(2));
    return result;
  }, {});
}

export function getDayStatus(hours, weekend) {
  if (weekend) return hours > 0 ? 'weekend-filled' : 'weekend';
  if (hours > 8) return 'overtime';
  if (hours >= 8) return 'complete';
  if (hours > 0) return 'partial';
  return 'empty';
}

export function getCalendarYears(year) {
  return Array.from({ length: 21 }, (_, index) => Number(year) - 10 + index);
}

function formatHoursWithWord(value) {
  const number = Number(value);
  const formatted = number.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (!Number.isInteger(number)) return `${formatted} часа`;
  const lastTwo = Math.abs(number) % 100;
  const last = lastTwo % 10;
  const word = lastTwo >= 11 && lastTwo <= 14
    ? 'часов'
    : last === 1
      ? 'час'
      : last >= 2 && last <= 4
        ? 'часа'
        : 'часов';
  return `${formatted} ${word}`;
}

export function getDayTooltip(day, hours, weekend) {
  const date = format(day, 'd MMMM', { locale: ru });
  const formattedHours = Number(hours).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  if (weekend) return `${date} · ${formatHoursWithWord(hours)} · выходной`;
  if (hours > 8) {
    return `${date} · ${formatHoursWithWord(hours)} · на ${formatHoursWithWord(hours - 8)} больше дневной нормы`;
  }
  if (hours === 8) return `${date} · 8 часов · день заполнен`;
  return `${date} · ${formattedHours} из 8 часов`;
}

const menuProps = {
  PaperProps: {
    sx: {
      maxHeight: 224,
      mt: 0.5,
      border: '1px solid #E2E4E9',
      borderRadius: '8px',
      boxShadow: '0 6px 18px rgba(31,42,68,.12)',
    },
  },
  MenuListProps: {
    dense: true,
    sx: {
      py: 0.5,
      '& .MuiMenuItem-root': { minHeight: 36, height: 36, fontSize: 13 },
    },
  },
};

const lightTooltipProps = {
  tooltip: {
    sx: {
      maxWidth: 260,
      px: 1.25,
      py: 1,
      border: '1px solid #E2E4E9',
      borderRadius: '8px',
      bgcolor: '#FFFFFF',
      color: '#424957',
      boxShadow: '0 6px 18px rgba(31,42,68,.12)',
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: 400,
      lineHeight: '16px',
    },
  },
  arrow: {
    sx: {
      color: '#FFFFFF',
      '&::before': { border: '1px solid #E2E4E9', boxSizing: 'border-box' },
    },
  },
};

const arrowButtonSx = {
  width: 24,
  height: 40,
  p: 0,
  flexShrink: 0,
  color: '#4A69D9',
  overflow: 'visible',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: '50%',
    bgcolor: 'transparent',
  },
  '&:hover': { bgcolor: 'transparent' },
  '&:hover::before': { bgcolor: MAIN_50 },
  '&:focus-visible': { outline: 0 },
  '&:focus-visible::before': { bgcolor: MAIN_50, boxShadow: `0 0 0 2px ${MAIN_200}` },
  '& .MuiSvgIcon-root': { position: 'relative', zIndex: 1 },
};

const selectSx = {
  minWidth: 0,
  flex: 1,
  height: 32,
  borderRadius: '8px',
  bgcolor: '#FFFFFF',
  color: '#424957',
  fontSize: 13,
  fontWeight: 400,
  '& .MuiSelect-select': {
    minWidth: 0,
    px: 1.25,
    py: 0,
    display: 'flex',
    alignItems: 'center',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E2E4E9' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C5C9D3' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: MAIN_500,
    borderWidth: 1,
  },
  '& .MuiSvgIcon-root': { right: 7, fontSize: 18, color: '#7F899E' },
};

export default function MonthHeatmapCalendar({
  month,
  selectedWeek,
  entries = [],
  loading = false,
  error = '',
  onMonthChange,
  onSelectWeek,
  onRetry,
  compact = false,
}) {
  const days = useMemo(() => getCalendarDays(month), [month]);
  const hoursByDay = useMemo(() => summarizeEntriesByDay(entries), [entries]);
  const selectedStart = startOfWeek(new Date(selectedWeek), { weekStartsOn: 1 });
  const selectedEnd = addDays(selectedStart, 6);
  const today = new Date();
  const years = useMemo(() => getCalendarYears(month.getFullYear()), [month]);

  const changeMonthPart = (nextMonth) => {
    onMonthChange(new Date(month.getFullYear(), Number(nextMonth), 1));
  };

  const changeYearPart = (nextYear) => {
    onMonthChange(new Date(Number(nextYear), month.getMonth(), 1));
  };

  return (
    <Box
      component="section"
      aria-label="Календарь заполнения времени"
      sx={{
        width: '100%',
        minWidth: 0,
        maxWidth: 'none',
        minHeight: 0,
        flexShrink: 0,
        boxSizing: 'border-box',
        p: compact ? 1.5 : 2,
        border: '1px solid #E2E4E9',
        borderRadius: '13px',
        bgcolor: '#FFFFFF',
        boxShadow: '0 5px 13px -5px rgba(10,9,11,.05)',
        containerType: 'inline-size',
        '@container (max-width: 319px)': { p: 1.5 },
        '@media (max-width: 767px)': { p: 1 },
      }}
    >
      <Box
        sx={{
          height: compact ? 40 : 44,
          display: 'flex',
          alignItems: 'center',
          gap: compact ? 0.75 : 1.5,
          mb: 1,
          '@container (max-width: 319px)': { height: 40, gap: 0.75 },
          '@media (max-width: 767px)': { height: 40, gap: 0.75 },
        }}
      >
        <IconButton
          size="small"
          aria-label="Предыдущий месяц"
          onClick={() => onMonthChange(addMonths(month, -1))}
          sx={arrowButtonSx}
        >
          <ChevronLeftRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>

        <Select
          size="small"
          value={month.getMonth()}
          onChange={(event) => changeMonthPart(event.target.value)}
          inputProps={{ 'aria-label': 'Месяц' }}
          MenuProps={menuProps}
          sx={selectSx}
        >
          {MONTH_LABELS.map((label, index) => <MenuItem key={label} value={index}>{label}</MenuItem>)}
        </Select>

        <Select
          size="small"
          value={month.getFullYear()}
          onChange={(event) => changeYearPart(event.target.value)}
          inputProps={{ 'aria-label': 'Год' }}
          MenuProps={menuProps}
          sx={selectSx}
        >
          {years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}
        </Select>

        <IconButton
          size="small"
          aria-label="Следующий месяц"
          onClick={() => onMonthChange(addMonths(month, 1))}
          sx={arrowButtonSx}
        >
          <ChevronRightRoundedIcon sx={{ fontSize: 22 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridAutoRows: 20 }}>
        {WEEKDAY_LABELS.map((label, index) => (
          <Typography
            key={`${label}-${index}`}
            sx={{
              display: 'grid',
              placeItems: 'center',
              fontSize: 11,
              lineHeight: '16px',
              fontWeight: 400,
              color: '#7F899E',
            }}
          >
            {label}
          </Typography>
        ))}
      </Box>

      <Box sx={{ mt: 0.5, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
        {days.map((day, index) => {
          const key = toDateKey(day);
          const hours = Number(hoursByDay[key] || 0);
          const weekend = day.getDay() === 0 || day.getDay() === 6;
          const status = getDayStatus(hours, weekend);
          const inSelectedWeek = day >= selectedStart && day <= selectedEnd;
          const currentMonth = isSameMonth(day, month);
          const todayDay = isSameDay(day, today);
          const tooltip = getDayTooltip(day, hours, weekend);
          const rowStart = index % 7 === 0;
          const rowEnd = index % 7 === 6;
          const filled = status === 'partial' || status === 'complete' || status === 'overtime' || status === 'weekend-filled';
          const complete = status === 'complete' || status === 'overtime';

          return (
            <Tooltip key={key} title={tooltip} arrow componentsProps={lightTooltipProps}>
              <Box
                component="button"
                type="button"
                aria-label={tooltip}
                aria-pressed={inSelectedWeek}
                onClick={() => onSelectWeek(startOfWeek(day, { weekStartsOn: 1 }))}
                sx={{
                  position: 'relative',
                  height: compact ? 22 : 36,
                  minWidth: 0,
                  p: 0,
                  border: 0,
                  borderRadius: rowStart ? '18px 0 0 18px' : rowEnd ? '0 18px 18px 0' : 0,
                  bgcolor: inSelectedWeek ? MAIN_50 : 'transparent',
                  color: currentMonth ? (weekend ? '#586174' : '#0B0C0F') : '#AEB4C0',
                  font: 'inherit',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  '&:hover': { bgcolor: inSelectedWeek ? MAIN_50 : 'transparent' },
                  '&:focus-visible': { outline: 0, zIndex: 1 },
                  '&:hover > span': {
                    bgcolor: filled ? (complete ? MAIN_500 : MAIN_100) : MAIN_50,
                  },
                  '&:focus-visible > span': {
                    boxShadow: todayDay
                      ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${MAIN_500}`
                      : `0 0 0 2px ${MAIN_200}`,
                  },
                  '@container (max-width: 319px)': { height: 22 },
                  '@media (max-width: 767px)': { height: 22 },
                }}
              >
                <Box
                  component="span"
                  sx={{
                    position: 'relative',
                    width: compact ? 22 : 32,
                    height: compact ? 22 : 32,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '50%',
                    border: 0,
                    bgcolor: complete ? MAIN_500 : filled ? MAIN_100 : 'transparent',
                    color: complete ? '#FFFFFF' : 'inherit',
                    boxShadow: todayDay
                      ? filled
                        ? `0 0 0 2px #FFFFFF, 0 0 0 3px ${MAIN_500}`
                        : `0 0 0 1px ${MAIN_500}`
                      : 'none',
                    fontSize: compact ? 11 : 13,
                    lineHeight: 1,
                    fontWeight: complete ? 600 : 400,
                    '@container (max-width: 319px)': { width: 22, height: 22, fontSize: 11 },
                    '@media (max-width: 767px)': { width: 22, height: 22, fontSize: 11 },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      lineHeight: 1,
                    }}
                  >
                    {format(day, 'd')}
                  </Box>
                  {status === 'overtime' && (
                    <Box
                      component="span"
                      aria-hidden="true"
                      sx={{
                        position: 'absolute',
                        left: '50%',
                        bottom: compact ? 1 : 2,
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        transform: 'translateX(-50%)',
                        bgcolor: '#FFFFFF',
                        '@container (max-width: 319px)': { bottom: 1 },
                        '@media (max-width: 767px)': { bottom: 1 },
                      }}
                    />
                  )}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {loading && (
        <Box sx={{ mt: 0.75, height: 2, bgcolor: '#EEF1F8', borderRadius: 999, overflow: 'hidden' }}>
          <Box sx={{ width: '45%', height: '100%', bgcolor: '#4A69D9', borderRadius: 999 }} />
        </Box>
      )}
      {error && (
        <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography sx={{ fontSize: 11, color: '#B42318' }}>Не удалось обновить календарь</Typography>
          <Button size="small" onClick={onRetry} sx={{ minWidth: 0, p: 0, fontSize: 11, textTransform: 'none' }}>Повторить</Button>
        </Box>
      )}
    </Box>
  );
}
