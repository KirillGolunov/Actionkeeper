import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from '../i18n/I18nProvider';
import { PROJECT_CATEGORY_ORDER, getProjectCategoryChipStyles, getProjectCategoryLabel, getProjectCategoryVisual } from '../utils/projectCategories';
import OverflowTooltip from './OverflowTooltip';
import ProjectDialogLayout from './ProjectDialogLayout';

export const WEEK_STATUS_COLORS = {
  complete: { background: '#4A68D9', foreground: '#FFFFFF', hover: '#3E5BC7' },
  partial: { background: '#D6DCF4', foreground: '#3656C7', hover: '#AABAEB' },
  missing: { background: '#F1A28F', foreground: '#344054', hover: '#F6C2B7' },
  in_progress: { background: '#D6DCF4', foreground: '#3656C7', hover: '#AABAEB' },
  future: { background: '#F7F8FA', foreground: '#98A2B3', hover: '#EAECF0' },
  not_applicable: { background: '#F7F8FA', foreground: '#98A2B3', hover: '#EAECF0' },
};

export function getWeekStatusChipStyles(status) {
  if (status === 'complete') return getProjectCategoryChipStyles('internal_project');
  if (status === 'in_progress') return getProjectCategoryChipStyles('people_development');
  if (status === 'missing' || status === 'partial') return {
    backgroundColor: '#FCE3DC', color: '#8C3F34', border: '1px solid #F1A28F',
  };
  return getProjectCategoryChipStyles('time_off');
}

export const HEATMAP_GAP = 2;
export const HEATMAP_COMPACT_BREAKPOINT = 1024;
export const HEATMAP_ASPECT_RATIO = '1 / 1';
export const HEATMAP_MIN_WEEK_TRACK = 14;
export const EMPLOYEE_COLUMN_MIN_WIDTH = 220;

let textMeasurementCanvas;

export function measureTextWidth(text, font) {
  if (typeof document !== 'undefined' && typeof window !== 'undefined' && !/jsdom/i.test(window.navigator?.userAgent || '')) {
    textMeasurementCanvas ||= document.createElement('canvas');
    const context = textMeasurementCanvas.getContext('2d');
    if (context) {
      context.font = font;
      return context.measureText(String(text || '')).width;
    }
  }
  const size = Number(font.match(/([\d.]+)px/)?.[1] || 14);
  return String(text || '').length * size * 0.55;
}

export function getEmployeeColumnWidth(users, formatMissingCount, measure = measureTextWidth, fontFamily = 'Roboto, Helvetica, Arial, sans-serif') {
  const widest = (users || []).reduce((maximum, user) => {
    const nameWidth = measure(user.label, `500 14px ${fontFamily}`);
    const missing = Number(user.counts?.missing || 0);
    const countWidth = missing ? measure(formatMissingCount(missing), `700 10.5px ${fontFamily}`) + 6 : 0;
    return Math.max(maximum, nameWidth + countWidth + 16);
  }, 0);
  return Math.ceil(Math.max(EMPLOYEE_COLUMN_MIN_WIDTH, widest));
}

export function getFullYearMinimumWidth(employeeColumnWidth, weekCount) {
  const count = Math.max(Number(weekCount) || 0, 0);
  return Math.ceil(employeeColumnWidth + count * HEATMAP_MIN_WEEK_TRACK + Math.max(count - 1, 0) * HEATMAP_GAP);
}

export function isCompactHeatmap(width) {
  return Number(width) < HEATMAP_COMPACT_BREAKPOINT;
}

export function getWeekVisual(status, hours = 0, target = 40, dominantCategory = null) {
  if (status === 'complete' && dominantCategory) {
    const visual = getProjectCategoryVisual(dominantCategory);
    return { background: visual.main, foreground: '#FFFFFF', hover: visual.main };
  }
  if (status === 'partial') return WEEK_STATUS_COLORS.missing;
  if (status !== 'in_progress') return WEEK_STATUS_COLORS[status] || WEEK_STATUS_COLORS.future;
  if (Number(hours) >= Number(target)) return WEEK_STATUS_COLORS.complete;
  if (Number(hours) > 0) return WEEK_STATUS_COLORS.in_progress;
  return { ...WEEK_STATUS_COLORS.in_progress, background: '#EEF1FC' };
}

export function getCurrentQuarter(date = new Date()) {
  return Math.floor(date.getMonth() / 3) + 1;
}

export function getWeeksForQuarter(weeks, quarter) {
  return (weeks || []).filter((week) => Math.floor((week.month - 1) / 3) + 1 === quarter);
}

export function getMonthGroups(weeks) {
  return (weeks || []).reduce((groups, week, index) => {
    const last = groups[groups.length - 1];
    if (last?.month === week.month) last.count += 1;
    else groups.push({ month: week.month, count: 1, startIndex: index });
    return groups;
  }, []);
}

export function getWeekNumbersInMonth(weeks) {
  let previousMonth = null;
  let number = 0;
  return (weeks || []).map((week) => {
    if (week.month !== previousMonth) {
      previousMonth = week.month;
      number = 0;
    }
    number += 1;
    return number;
  });
}

export function getWeekMonthGroupIndexes(weeks) {
  let previousMonth = null;
  let groupIndex = -1;
  return (weeks || []).map((week) => {
    if (week.month !== previousMonth) {
      previousMonth = week.month;
      groupIndex += 1;
    }
    return groupIndex;
  });
}

function LegendItem({ colors, label, swatchKey, marker = false }) {
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
    <Box data-legend-swatch={swatchKey} aria-hidden="true" sx={{ position: 'relative', width: 10, aspectRatio: '1 / 1', borderRadius: 0.6, bgcolor: colors.background }}>
      {marker && <Box data-legend-current-marker="true" sx={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', bgcolor: '#4A68D9', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />}
    </Box>
    <Typography sx={{ fontSize: 10, lineHeight: 1, color: '#667085', whiteSpace: 'nowrap' }}>{label}</Typography>
  </Box>;
}

export default function TeamWeeklyOverview({ onOpenTimesheet, year: controlledYear }) {
  const { t, locale } = useTranslation();
  const theme = useTheme();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const viewportCompact = useMediaQuery('(max-width:1023px)');
  const rootRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const [uncontrolledYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(() => getCurrentQuarter());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [focusedCell, setFocusedCell] = useState({ row: 0, column: 0 });
  const [focusWithin, setFocusWithin] = useState(false);
  const cellRefs = useRef(new Map());
  const focusAfterPeriodChange = useRef(false);
  const year = controlledYear ?? uncontrolledYear;

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    axios.get('/api/dashboard/team-weekly', { params: { year } })
      .then((response) => setData(response.data))
      .catch((requestError) => setError(requestError.response?.data?.error || t('teamWeekly.errors.fetch')))
      .finally(() => setLoading(false));
  }, [t, year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const updateWidth = (width) => {
      if (width > 0) setContainerWidth(width);
    };
    updateWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => updateWidth(entries[0]?.contentRect?.width || 0));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const employeeColumnWidth = useMemo(() => getEmployeeColumnWidth(
    data?.users,
    (count) => t('teamWeekly.missingCount', { count }),
    measureTextWidth,
    theme.typography.fontFamily,
  ), [data?.users, t, theme.typography.fontFamily]);
  const fullYearMinimumWidth = getFullYearMinimumWidth(employeeColumnWidth, data?.weeks?.length || 53);
  const effectiveCompactBreakpoint = Math.max(HEATMAP_COMPACT_BREAKPOINT, fullYearMinimumWidth);
  const fallbackWidth = typeof window === 'undefined' ? HEATMAP_COMPACT_BREAKPOINT : window.innerWidth;
  const compact = containerWidth === null
    ? viewportCompact || fallbackWidth < effectiveCompactBreakpoint
    : containerWidth < effectiveCompactBreakpoint;
  const visibleWeeks = useMemo(() => compact ? getWeeksForQuarter(data?.weeks, quarter) : (data?.weeks || []), [compact, data, quarter]);
  const monthGroups = useMemo(() => getMonthGroups(visibleWeeks), [visibleWeeks]);
  const weekNumbersInMonth = useMemo(() => getWeekNumbersInMonth(visibleWeeks), [visibleWeeks]);
  const weekMonthGroupIndexes = useMemo(() => getWeekMonthGroupIndexes(visibleWeeks), [visibleWeeks]);
  const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: 'short' }), [locale]);
  const outerGridTemplate = `${employeeColumnWidth}px minmax(0, 1fr)`;
  const weekGridTemplate = `repeat(${Math.max(visibleWeeks.length, 1)}, minmax(0, 1fr))`;
  const compactWeekWidth = Math.max(visibleWeeks.length * 20 + (visibleWeeks.length - 1) * HEATMAP_GAP, 0);
  const tourFilledCellKey = useMemo(() => {
    const users = data?.users || [];
    for (let row = 0; row < users.length; row += 1) {
      const weeksByStart = new Map(users[row].weeks.map((week) => [week.weekStart, week]));
      const completeColumn = visibleWeeks.findIndex((meta) => weeksByStart.get(meta.startDate)?.status === 'complete');
      if (completeColumn >= 0) return `${row}:${completeColumn}`;
    }
    for (let row = 0; row < users.length; row += 1) {
      const weeksByStart = new Map(users[row].weeks.map((week) => [week.weekStart, week]));
      const availableColumn = visibleWeeks.findIndex((meta) => Boolean(weeksByStart.get(meta.startDate)));
      if (availableColumn >= 0) return `${row}:${availableColumn}`;
    }
    return null;
  }, [data?.users, visibleWeeks]);
  const activeCell = focusWithin ? focusedCell : null;
  const weekGridSx = {
    minWidth: 0,
    width: '100%',
    maxWidth: compact ? `${compactWeekWidth}px` : 'none',
    display: 'grid',
    gridTemplateColumns: weekGridTemplate,
    columnGap: `${HEATMAP_GAP}px`,
  };

  useEffect(() => {
    if (!focusAfterPeriodChange.current || !data?.users?.length || !visibleWeeks.length) return;
    focusAfterPeriodChange.current = false;
    setFocusedCell({ row: 0, column: 0 });
    cellRefs.current.get('0:0')?.focus();
  }, [data, visibleWeeks]);

  useEffect(() => {
    setFocusedCell((current) => ({
      row: Math.max(0, Math.min((data?.users?.length || 1) - 1, current.row)),
      column: Math.max(0, Math.min((visibleWeeks.length || 1) - 1, current.column)),
    }));
  }, [data?.users?.length, quarter, visibleWeeks.length, year]);

  const statusLabel = (status) => t(`teamWeekly.status.${status}`);
  const categoryLabel = (category) => getProjectCategoryLabel(category, t);
  const formatHours = (hours) => Number(hours || 0).toLocaleString(locale, { maximumFractionDigits: 1 });
  const formatWeek = (week) => `${format(parseISO(week.startDate), 'd MMM', { locale: dateLocale })} — ${format(parseISO(week.endDate), 'd MMM yyyy', { locale: dateLocale })}`;
  const selectedWeek = selectedCell ? data?.weeks?.find((week) => week.startDate === selectedCell.week.weekStart) : null;
  const detailWeek = selectedDetail?.week || selectedCell?.week;
  const selectedCategoryHours = detailWeek?.categoryHours || [];
  const selectedProjectsByCategory = useMemo(() => (detailWeek?.projectHours || []).reduce((groups, project) => {
    const items = groups.get(project.category) || [];
    items.push(project);
    groups.set(project.category, items);
    return groups;
  }, new Map()), [detailWeek]);

  const selectQuarter = (value) => {
    focusAfterPeriodChange.current = true;
    setQuarter(value);
  };

  useEffect(() => {
    let ignore = false;
    if (!selectedCell) {
      setSelectedDetail(null);
      setDetailError('');
      return undefined;
    }
    setSelectedDetail(null);
    setDetailError('');
    setDetailLoading(true);
    axios.get('/api/dashboard/team-weekly/detail', { params: { userId: selectedCell.user.id, weekStart: selectedCell.week.weekStart } })
      .then((response) => { if (!ignore) setSelectedDetail(response.data?.week ? response.data : { week: selectedCell.week, canOpenTimesheet: true }); })
      .catch((requestError) => { if (!ignore) setDetailError(requestError.response?.data?.error || t('teamWeekly.errors.detail')); })
      .finally(() => { if (!ignore) setDetailLoading(false); });
    return () => { ignore = true; };
  }, [selectedCell, t]);

  const moveFocus = (event, row, column, user, week) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedCell({ user, week });
      return;
    }
    let nextRow = row;
    let nextColumn = column;
    if (event.key === 'ArrowLeft') nextColumn -= 1;
    else if (event.key === 'ArrowRight') nextColumn += 1;
    else if (event.key === 'ArrowUp') nextRow -= 1;
    else if (event.key === 'ArrowDown') nextRow += 1;
    else if (event.key === 'Home') nextColumn = 0;
    else if (event.key === 'End') nextColumn = visibleWeeks.length - 1;
    else return;
    event.preventDefault();
    nextRow = Math.max(0, Math.min(data.users.length - 1, nextRow));
    nextColumn = Math.max(0, Math.min(visibleWeeks.length - 1, nextColumn));
    setFocusedCell({ row: nextRow, column: nextColumn });
    cellRefs.current.get(`${nextRow}:${nextColumn}`)?.focus();
  };

  const clearPointerHighlight = () => {
    rootRef.current?.querySelectorAll('[data-pointer-highlighted="true"], [data-pointer-intersection="true"]').forEach((element) => {
      element.setAttribute('data-pointer-highlighted', 'false');
      element.setAttribute('data-pointer-intersection', 'false');
    });
  };

  const showPointerHighlight = (row, column) => {
    clearPointerHighlight();
    const root = rootRef.current;
    const rowElement = root?.querySelector(`[data-heatmap-row="${row}"]`);
    rowElement?.setAttribute('data-pointer-highlighted', 'true');
    rowElement?.querySelector('[data-employee-cell="true"]')?.setAttribute('data-pointer-highlighted', 'true');
    root?.querySelectorAll(`[data-week-column="${column}"], [data-week-header="${column}"]`).forEach((element) => element.setAttribute('data-pointer-highlighted', 'true'));
    rowElement?.querySelector(`[data-week-column="${column}"]`)?.setAttribute('data-pointer-intersection', 'true');
  };

  return <Box ref={rootRef} role="tabpanel" id="team-completion-panel" aria-labelledby="team-completion-tab" sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: compact ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: compact ? 1 : 0, containerType: 'inline-size' }}>
    {compact && <Box sx={{ minHeight: 40, px: 1, py: 0.5, display: 'flex', alignItems: 'center', border: '1px solid #E2E4E9', borderRadius: 2.5, bgcolor: '#FFF' }}>
      <Box role="group" aria-label={t('teamWeekly.quarterSelector')} sx={{ display: 'flex', p: 0.25, gap: 0.25, borderRadius: 1.5, bgcolor: '#F2F4F7' }}>
        {[1, 2, 3, 4].map((value) => <Button key={value} size="small" aria-pressed={quarter === value} onClick={() => selectQuarter(value)} sx={{ minWidth: 43, px: 0.75, py: 0.2, fontSize: 10.5, lineHeight: 1.5, color: quarter === value ? '#FFF' : '#667085', bgcolor: quarter === value ? '#4A68D9' : 'transparent', '&:hover': { bgcolor: quarter === value ? '#3E5BC7' : '#E4E7EC' } }}>{t(`teamWeekly.quarters.q${value}`)}</Button>)}
      </Box>
    </Box>}

    <Box data-product-tour="heatmap" data-testid="team-week-grid" data-week-count={visibleWeeks.length} data-compact={compact ? 'true' : 'false'} data-cell-gap={HEATMAP_GAP} data-employee-column-width={employeeColumnWidth} sx={{ position: 'relative', minHeight: 0, border: '1px solid #E2E4E9', borderRadius: 2.5, bgcolor: '#FFF', overflow: 'hidden', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr) auto' }}>
      {error ? <Alert severity="error" sx={{ gridRow: 2 }} action={<Button onClick={load}>{t('common.actions.retry')}</Button>}>{error}</Alert> : data && !data.users.length ? <Box sx={{ gridRow: 2, height: '100%', display: 'grid', placeItems: 'center' }}><Typography sx={{ color: '#98A2B3' }}>{t('teamWeekly.empty')}</Typography></Box> : data ? <Box role="grid" aria-label={t('teamWeekly.tableAria')} aria-rowcount={data.users.length} aria-colcount={visibleWeeks.length} onMouseLeave={clearPointerHighlight} onFocusCapture={() => setFocusWithin(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false); }} sx={{ gridRow: '1 / 3', height: '100%', minHeight: 0, overflowY: 'auto', overflowX: 'hidden', scrollbarGutter: 'stable' }}>
        <Box role="rowgroup" sx={{ position: 'sticky', top: 0, zIndex: 4, bgcolor: '#F8F9FB', borderBottom: '1px solid #E2E4E9' }}>
          <Box role="row" sx={{ display: 'grid', gridTemplateColumns: outerGridTemplate, minHeight: 22, alignItems: 'center' }}>
            <Typography role="columnheader" sx={{ minWidth: 0, px: 1, fontSize: 11, fontWeight: 700, color: '#344054' }}>{t('teamWeekly.employee')}</Typography>
            <Box sx={weekGridSx}>
              {monthGroups.map((group, index) => <Typography role="columnheader" key={`${group.month}-${index}`} sx={{ gridColumn: `${group.startIndex + 1} / span ${group.count}`, minWidth: 0, overflow: 'hidden', textAlign: 'center', fontSize: 9.5, lineHeight: 1, fontWeight: 600, color: '#667085', textTransform: 'capitalize' }}>
                {monthFormatter.format(new Date(Date.UTC(year, group.month - 1, 1)))}
              </Typography>)}
            </Box>
          </Box>
          <Box role="row" sx={{ display: 'grid', gridTemplateColumns: outerGridTemplate, minHeight: 18, alignItems: 'stretch' }}>
            <Box />
            <Box sx={weekGridSx}>
              {visibleWeeks.map((week, index) => {
                const monthBackground = weekMonthGroupIndexes[index] % 2 ? '#F8FAFD' : 'transparent';
                const monthStart = index > 0 && visibleWeeks[index - 1].month !== week.month;
                const highlighted = activeCell?.column === index;
                return <Box key={week.startDate} title={`${t('teamWeekly.weekNumber', { number: week.number })} · ${formatWeek(week)}`} data-week-header={index} data-month-group={weekMonthGroupIndexes[index]} data-month-start={monthStart ? 'true' : 'false'} data-column-highlighted={highlighted ? 'true' : 'false'} data-pointer-highlighted="false" sx={{ minWidth: 0, display: 'grid', placeItems: 'center', bgcolor: highlighted ? '#E9EEFB' : monthBackground, borderRadius: '3px 3px 0 0', ...(monthStart ? { position: 'relative', '&::after': { content: '""', position: 'absolute', zIndex: 2, pointerEvents: 'none', left: '-1px', top: 0, bottom: 0, width: '1px', bgcolor: highlighted ? '#E9EEFB' : '#D0D5DD' } } : {}), '&[data-pointer-highlighted="true"]': { bgcolor: '#E9EEFB', '&::after': { bgcolor: '#E9EEFB' } } }}>
                  <Typography role="columnheader" sx={{ minWidth: 0, overflow: 'hidden', textAlign: 'center', fontSize: 8, lineHeight: '10px', fontWeight: 600, color: activeCell?.column === index ? '#3656C7' : '#7A8496' }}>
                    {weekNumbersInMonth[index]}
                  </Typography>
                </Box>;
              })}
            </Box>
          </Box>
        </Box>
        <Box role="rowgroup" sx={{ display: 'grid', alignContent: 'start', rowGap: `${HEATMAP_GAP}px` }}>
          {data.users.map((user, row) => {
            const userWeekByStart = new Map(user.weeks.map((week) => [week.weekStart, week]));
            const rowActive = activeCell?.row === row;
            return <Box role="row" data-heatmap-row={row} data-row-highlighted={rowActive ? 'true' : 'false'} data-pointer-highlighted="false" key={user.id} sx={{ display: 'grid', gridTemplateColumns: outerGridTemplate, alignItems: 'stretch', bgcolor: rowActive ? '#F3F6FC' : 'transparent', '&[data-row-highlighted="true"] [data-week-cell="true"], &[data-pointer-highlighted="true"] [data-week-cell="true"]': { boxShadow: 'inset 0 0 0 1px rgba(52, 64, 84, 0.3)' }, '&[data-pointer-highlighted="true"]': { bgcolor: '#F3F6FC' } }}>
              <Box role="rowheader" data-employee-cell="true" data-pointer-highlighted="false" sx={{ minWidth: 0, height: '100%', px: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0.75, bgcolor: rowActive ? '#E9EEFB' : 'transparent', '&[data-pointer-highlighted="true"]': { bgcolor: '#E9EEFB' } }}>
                <Typography data-user-name="true" sx={{ minWidth: 0, whiteSpace: 'nowrap', fontSize: 14, lineHeight: 1.2, fontWeight: 500, color: '#344054' }}>{user.label}</Typography>
                {user.counts.missing > 0 && <Tooltip title={t('teamWeekly.missingCountTooltip', { count: user.counts.missing })} arrow><Typography data-missing-count="true" sx={{ flexShrink: 0, fontSize: 10.5, lineHeight: 1, fontWeight: 400, color: '#344054', cursor: 'help' }}>{t('teamWeekly.missingCount', { count: user.counts.missing })}</Typography></Tooltip>}
              </Box>
              <Box sx={weekGridSx}>
                {visibleWeeks.map((meta, column) => {
                const week = userWeekByStart.get(meta.startDate);
                const columnActive = activeCell?.column === column;
                const intersectionActive = rowActive && columnActive;
                const monthBackground = weekMonthGroupIndexes[column] % 2 ? '#F8FAFD' : 'transparent';
                const columnBackground = intersectionActive ? '#DDE6FA' : columnActive ? '#E9EEFB' : monthBackground;
                const monthStart = column > 0 && visibleWeeks[column - 1].month !== meta.month;
                const separatorColor = columnActive ? columnBackground : '#D0D5DD';
                const monthSeparatorSx = monthStart ? { position: 'relative', '&::after': { content: '""', position: 'absolute', zIndex: 2, pointerEvents: 'none', left: '-1px', top: 0, bottom: 0, width: '1px', bgcolor: separatorColor } } : {};
                if (!week) return <Box data-week-column={column} data-month-group={weekMonthGroupIndexes[column]} data-month-start={monthStart ? 'true' : 'false'} data-column-highlighted={columnActive ? 'true' : 'false'} data-pointer-highlighted="false" data-pointer-intersection="false" key={meta.startDate} sx={{ minWidth: 0, bgcolor: columnBackground, ...monthSeparatorSx, boxShadow: columnActive ? `0 -1px 0 ${columnBackground}, 0 1px 0 ${columnBackground}` : 'none', '&[data-pointer-highlighted="true"]': { bgcolor: '#E9EEFB', '&::after': { bgcolor: '#E9EEFB' }, boxShadow: '0 -1px 0 #E9EEFB, 0 1px 0 #E9EEFB' }, '&[data-pointer-intersection="true"]': { bgcolor: '#DDE6FA', '&::after': { bgcolor: '#DDE6FA' }, boxShadow: '0 -1px 0 #DDE6FA, 0 1px 0 #DDE6FA' } }} />;
                const colors = getWeekVisual(week.status, week.hours, data.weeklyTargetHours, week.dominantCategory);
                const weekLabel = formatWeek(meta);
                const dominantCategoryText = week.dominantCategory ? t('teamWeekly.dominantCategory', { category: categoryLabel(week.dominantCategory) }) : '';
                const ariaLabel = [t('teamWeekly.cellAria', { user: user.label, week: weekLabel, hours: formatHours(week.hours), status: statusLabel(week.status) }), dominantCategoryText].filter(Boolean).join(', ');
                const tooltip = [`${t('teamWeekly.weekNumber', { number: meta.number })} · ${user.label} · ${weekLabel}`, `${formatHours(week.hours)} / ${data.weeklyTargetHours} ${t('teamWeekly.hoursShort')} · ${statusLabel(week.status)}`, dominantCategoryText].filter(Boolean).join('\n');
                const refKey = `${row}:${column}`;
                return <Box data-week-column={column} data-month-group={weekMonthGroupIndexes[column]} data-month-start={monthStart ? 'true' : 'false'} data-column-highlighted={columnActive ? 'true' : 'false'} data-pointer-highlighted="false" data-pointer-intersection="false" key={week.weekStart} sx={{ minWidth: 0, p: '1px', display: 'grid', placeItems: 'center', bgcolor: columnBackground, ...monthSeparatorSx, boxShadow: columnActive ? `0 -1px 0 ${columnBackground}, 0 1px 0 ${columnBackground}` : 'none', '&[data-column-highlighted="true"] [data-week-cell="true"], &[data-pointer-highlighted="true"] [data-week-cell="true"]': { boxShadow: 'inset 0 0 0 1px rgba(52, 64, 84, 0.3)' }, '&[data-pointer-highlighted="true"]': { bgcolor: '#E9EEFB', '&::after': { bgcolor: '#E9EEFB' }, boxShadow: '0 -1px 0 #E9EEFB, 0 1px 0 #E9EEFB' }, '&[data-pointer-intersection="true"]': { bgcolor: '#DDE6FA', '&::after': { bgcolor: '#DDE6FA' }, boxShadow: '0 -1px 0 #DDE6FA, 0 1px 0 #DDE6FA' } }}>
                    <Box data-week-cell="true" data-week-tour-filled={refKey === tourFilledCellKey ? 'true' : undefined} data-dominant-category={week.dominantCategory || ''} data-current-marker={week.status === 'in_progress' ? 'true' : 'false'} component="button" type="button" role="gridcell" tabIndex={focusedCell.row === row && focusedCell.column === column ? 0 : -1} ref={(node) => { if (node) cellRefs.current.set(refKey, node); else cellRefs.current.delete(refKey); }} title={tooltip.replace('\n', ' · ')} aria-label={ariaLabel} onMouseEnter={() => showPointerHighlight(row, column)} onFocus={() => setFocusedCell({ row, column })} onKeyDown={(event) => moveFocus(event, row, column, user, week)} onClick={() => setSelectedCell({ user, week })} sx={{ position: 'relative', width: '100%', minWidth: 0, aspectRatio: HEATMAP_ASPECT_RATIO, p: 0, display: 'block', border: 0, borderRadius: '3px', bgcolor: colors.background, color: colors.foreground, cursor: 'pointer', '&:hover': { bgcolor: colors.hover }, '&:focus-visible': { outline: '2px solid #4A68D9', outlineOffset: 1, zIndex: 1 }, ...(week.status === 'in_progress' ? { '&::after': { content: '""', position: 'absolute', width: 4, height: 4, borderRadius: '50%', bgcolor: Number(week.hours) >= Number(data.weeklyTargetHours) ? '#FFFFFF' : '#4A68D9', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } } : {}) }} />
                </Box>;
                })}
              </Box>
            </Box>;
          })}
        </Box>
      </Box> : <Box sx={{ gridRow: '1 / 3' }} />}
      <Box component="footer" data-heatmap-legend="true" sx={{ gridRow: 3, minHeight: 32, px: 1, py: 0.6, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.8, borderTop: '1px solid #E2E4E9', bgcolor: '#FFF' }}>
        {PROJECT_CATEGORY_ORDER.filter((category) => category !== 'unclassified').map((category) => <LegendItem key={category} swatchKey={category} colors={{ background: getProjectCategoryVisual(category).main }} label={categoryLabel(category)} />)}
        {['missing', 'in_progress'].map((status) => <LegendItem key={status} swatchKey={status} colors={WEEK_STATUS_COLORS[status]} label={statusLabel(status)} marker={status === 'in_progress'} />)}
      </Box>
      {loading && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(246,247,249,.65)', zIndex: 10 }}><CircularProgress size={28} /></Box>}
    </Box>

    <ProjectDialogLayout
      open={Boolean(selectedCell)}
      onClose={() => setSelectedCell(null)}
      title={selectedDetail?.canOpenTimesheet === false ? t('teamWeekly.dialog.detailsTitle') : t('teamWeekly.dialog.title')}
      subtitle={selectedCell && selectedWeek ? t('teamWeekly.dialog.content', { user: selectedCell.user.label, week: formatWeek(selectedWeek) }) : ''}
      chips={selectedCell ? [{
        key: 'status',
        label: statusLabel(selectedCell.week.status),
        sx: { height: 22, borderRadius: '6px', fontSize: 12, fontWeight: 500, ...getWeekStatusChipStyles(selectedCell.week.status) },
      }] : []}
      secondaryLabel={t('common.actions.cancel')}
      onSecondary={() => setSelectedCell(null)}
      primaryLabel={t('teamWeekly.dialog.confirm')}
      primaryVisible={Boolean(selectedDetail?.canOpenTimesheet)}
      onPrimary={() => { onOpenTimesheet?.(selectedCell.user.id, selectedCell.week.weekStart); setSelectedCell(null); }}
      compact
      tourTarget="week-detail-dialog"
    >
      {detailError ? <Alert severity="error">{detailError}</Alert> : selectedCell && selectedWeek && detailWeek && <Box sx={{ minWidth: 0, display: 'grid', gap: 1.5 }}>
        {detailLoading ? <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}><CircularProgress size={18} /></Box> : null}
        <Box sx={{ px: 1.25, py: 1, borderRadius: 1.5, bgcolor: '#F5F7FA' }}>
          <Typography sx={{ color: '#344054', fontSize: 14, fontWeight: 500 }}>{t('teamWeekly.dialog.total', { hours: formatHours(detailWeek.hours), target: data.weeklyTargetHours, status: statusLabel(detailWeek.status) })}</Typography>
        </Box>
        <Box sx={{ minWidth: 0, display: 'grid', gap: 1 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>{t('teamWeekly.dialog.categoryHours')}</Typography>
          {selectedCategoryHours.length ? selectedCategoryHours.map(({ category, hours }) => {
            const visual = getProjectCategoryVisual(category);
            const projects = selectedProjectsByCategory.get(category) || [];
            return <Box key={category} sx={{ minWidth: 0, display: 'grid', gap: 0.65 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box aria-hidden="true" sx={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: visual.main }} />
                  <Typography sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 500, color: '#344054' }}>{categoryLabel(category)}</Typography>
                </Box>
                <Typography sx={{ flexShrink: 0, fontSize: 13, fontWeight: 500, color: '#344054' }}>{formatHours(hours)} {t('teamWeekly.hoursShort')}</Typography>
              </Box>
              {projects.length > 0 && <Box sx={{ minWidth: 0, maxWidth: '100%', ml: 0.5, pl: 1.5, display: 'grid', gap: 0.45, overflow: 'hidden', borderLeft: `2px solid ${visual.main}` }}>
                {projects.map((project) => <Box key={`${project.category}-${project.id ?? 'none'}`} sx={{ minWidth: 0, maxWidth: '100%', mx: -0.5, px: 0.5, py: 0.2, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', borderRadius: 1, '&:hover': { bgcolor: '#F2F4F7' } }}>
                  <OverflowTooltip title={project.code ? `${project.code}${project.name ? ` — ${project.name}` : ''}` : project.name || t('teamWeekly.dialog.noProject')} overflowAxis="horizontal" placement="top" arrow>
                    <Typography data-project-name sx={{ flex: '1 1 0%', minWidth: 0, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, color: '#667085' }}>{project.code ? `${project.code}${project.name ? ` — ${project.name}` : ''}` : project.name || t('teamWeekly.dialog.noProject')}</Typography>
                  </OverflowTooltip>
                  <Typography sx={{ flexShrink: 0, fontSize: 12.5, color: '#667085' }}>{formatHours(project.hours)} {t('teamWeekly.hoursShort')}</Typography>
                </Box>)}
              </Box>}
            </Box>;
          }) : <Typography sx={{ fontSize: 13, color: '#667085' }}>{t('teamWeekly.dialog.noHours')}</Typography>}
        </Box>
        {selectedDetail?.canOpenTimesheet ? <Typography sx={{ fontSize: 12.5, color: '#667085' }}>{t('teamWeekly.dialog.navigationNotice')}</Typography> : <Typography sx={{ fontSize: 12.5, color: '#667085' }}>{t('teamWeekly.dialog.readOnlyNotice')}</Typography>}
      </Box>}
    </ProjectDialogLayout>
  </Box>;
}
