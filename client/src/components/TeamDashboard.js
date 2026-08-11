import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  LinearProgress,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import axios from 'axios';
import { addDays, addMonths, addQuarters, addYears, endOfMonth, endOfQuarter, endOfYear, format, startOfMonth, startOfQuarter, startOfWeek, startOfYear } from 'date-fns';
import { ru } from 'date-fns/locale';
import SegmentedCapsule from './SegmentedCapsule';
import { TimeStructureTrendCard } from './MineTimeAnalytics';
import ProjectAnalyticsDialog from './ProjectAnalyticsDialog';

const RANGE_OPTIONS = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' },
  { value: 'all', label: 'Всё время' },
];

const CLIENT_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'internal', label: 'Внутренние' },
  { value: 'external', label: 'Внешние' },
];

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatHours = (value) => Number(value || 0).toLocaleString('ru-RU', { maximumFractionDigits: 1 });

function getPeriod(range, anchor) {
  if (range === 'all') return { startDate: '2000-01-01', endDate: toDateKey(new Date()) };
  let start;
  let end;
  if (range === 'week') {
    start = startOfWeek(anchor, { weekStartsOn: 1 });
    end = addDays(start, 6);
  } else if (range === 'quarter') {
    start = startOfQuarter(anchor);
    end = endOfQuarter(anchor);
  } else if (range === 'year') {
    start = startOfYear(anchor);
    end = endOfYear(anchor);
  } else {
    start = startOfMonth(anchor);
    end = endOfMonth(anchor);
  }
  return { startDate: toDateKey(start), endDate: toDateKey(end) };
}

function moveAnchor(anchor, range, direction) {
  if (range === 'week') return addDays(anchor, direction * 7);
  if (range === 'quarter') return addQuarters(anchor, direction);
  if (range === 'year') return addYears(anchor, direction);
  return addMonths(anchor, direction);
}

function getPeriodLabel(range, anchor) {
  if (range === 'all') return 'Всё время';
  if (range === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale: ru })} — ${format(addDays(start, 6), 'd MMM yyyy', { locale: ru })}`;
  }
  if (range === 'quarter') return `${Math.floor(anchor.getMonth() / 3) + 1} квартал ${anchor.getFullYear()}`;
  if (range === 'year') return String(anchor.getFullYear());
  return format(anchor, 'LLLL yyyy', { locale: ru });
}

function getTimeSeriesBucket(range) {
  if (range === 'week') return 'day';
  if (range === 'month') return 'week';
  if (range === 'all') return 'quarter';
  return 'month';
}

function ClientsCard({ data }) {
  const groups = useMemo(() => {
    const map = new Map();
    (data?.breakdowns?.clients || []).forEach((item) => {
      const key = item.clientType || 'external';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return ['external', 'internal'].map((key) => ({
      key,
      label: key === 'internal' ? 'Внутренние клиенты' : 'Внешние клиенты',
      items: (map.get(key) || []).sort((a, b) => Number(b.hours || 0) - Number(a.hours || 0)),
    })).filter((group) => group.items.length);
  }, [data]);
  const maximum = Math.max(1, ...groups.flatMap((group) => group.items.map((item) => Number(item.hours || 0))));

  return <Box sx={{ height: '100%', minHeight: 0, p: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflow: 'hidden' }}>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1D2433', mb: 1 }}>Часы по клиентам</Typography>
    <Box sx={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pr: 1.25, scrollbarGutter: 'stable' }}>
      {groups.map((group) => <Box key={group.key} sx={{ mb: 1.25 }}>
        <Typography sx={{ mb: 0.6, fontSize: 10.5, fontWeight: 600, color: '#7A8496' }}>{group.label}</Typography>
        {group.items.map((item) => <Box key={item.key} sx={{ mb: 0.65 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Tooltip title={item.label} arrow><Typography noWrap sx={{ minWidth: 0, fontSize: 10.8, color: '#424957' }}>{item.label}</Typography></Tooltip>
            <Typography sx={{ flexShrink: 0, fontSize: 10.8, fontWeight: 600 }}>{formatHours(item.hours)} ч</Typography>
          </Box>
          <Box sx={{ mt: 0.25, height: 4, borderRadius: 999, bgcolor: '#EEF1F8', overflow: 'hidden' }}>
            <Box sx={{ width: `${(Number(item.hours || 0) / maximum) * 100}%`, height: '100%', borderRadius: 999, bgcolor: '#7890E3' }} />
          </Box>
        </Box>)}
      </Box>)}
      {!groups.length && <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><Typography sx={{ fontSize: 12, color: '#98A2B3' }}>Нет данных за выбранный период</Typography></Box>}
    </Box>
  </Box>;
}

function TeamTable({ data, viewByUser, onViewByUserChange, showPercent, onShowPercentChange, onProjectOpen }) {
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const total = Number(data?.summary?.totalHours || 0);
  const projectRows = useMemo(() => (data?.projects || []).map((item) => ({
      key: `project-${item.project.id}`,
      label: [item.project.code, item.project.name].filter(Boolean).join(' — '),
      secondary: item.project.clientName,
      hours: Number(item.periodHours || 0),
      project: item.project,
    })), [data]);
  const userRows = useMemo(() => (data?.breakdowns?.users || []).map((item) => ({
    key: `user-${item.key}`,
    userId: item.key,
    label: item.label,
    hours: Number(item.hours || 0),
  })), [data]);
  const detailRows = useMemo(() => data?.breakdowns?.projectUsers || [], [data]);
  const projectById = useMemo(
    () => new Map(projectRows.map((row) => [String(row.project.id), row])),
    [projectRows]
  );
  const detailsByProject = useMemo(() => {
    const result = new Map();
    detailRows.forEach((item) => {
      const key = String(item.projectId);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push({
        key: `project-user-${item.projectId}-${item.userId}`,
        label: item.userLabel,
        hours: Number(item.hours || 0),
      });
    });
    result.forEach((items) => items.sort((left, right) => right.hours - left.hours || left.label.localeCompare(right.label, 'ru')));
    return result;
  }, [detailRows]);
  const detailsByUser = useMemo(() => {
    const result = new Map();
    detailRows.forEach((item) => {
      const projectRow = projectById.get(String(item.projectId));
      if (!projectRow) return;
      const key = String(item.userId);
      if (!result.has(key)) result.set(key, []);
      result.get(key).push({
        ...projectRow,
        key: `user-project-${item.userId}-${item.projectId}`,
        hours: Number(item.hours || 0),
      });
    });
    result.forEach((items) => items.sort((left, right) => right.hours - left.hours || left.label.localeCompare(right.label, 'ru')));
    return result;
  }, [detailRows, projectById]);
  const rows = viewByUser ? userRows : projectRows;

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [viewByUser, data?.period?.startDate, data?.period?.endDate]);

  const toggleExpanded = (key) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderValue = (hours, parentTotal = total) => showPercent
    ? `${parentTotal ? Math.round((hours / parentTotal) * 100) : 0}%`
    : `${formatHours(hours)} ч`;

  const renderDistributionBar = (hours, parentTotal = total, nested = false) => {
    const percent = parentTotal > 0 ? Math.min(100, Math.max(0, (hours / parentTotal) * 100)) : 0;
    return <Box
      role="progressbar"
      aria-label={`Распределение времени: ${Math.round(percent)}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      sx={{ width: '100%', height: nested ? 4 : 6, borderRadius: 999, bgcolor: nested ? '#EEEAF8' : '#EEF1F8', overflow: 'hidden' }}
    >
      <Box sx={{ width: `${percent}%`, height: '100%', borderRadius: 999, bgcolor: nested ? '#9B85D9' : '#7890E3', transition: 'width 180ms ease' }} />
    </Box>;
  };

  const renderPrimaryRow = (row) => {
    const isExpanded = expandedKeys.has(row.key);
    const children = viewByUser
      ? (detailsByUser.get(String(row.userId)) || [])
      : (detailsByProject.get(String(row.project.id)) || []);
    const subject = viewByUser ? 'пользователя' : 'проект';
    return <React.Fragment key={row.key}>
      <TableRow hover onClick={() => row.project && onProjectOpen(row.project)} sx={{ cursor: row.project ? 'pointer' : 'default' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <IconButton
              size="small"
              aria-label={`${isExpanded ? 'Свернуть' : 'Развернуть'} ${subject} ${row.label}`}
              aria-expanded={isExpanded}
              onClick={(event) => { event.stopPropagation(); toggleExpanded(row.key); }}
              sx={{ width: 28, height: 28, mr: 0.5, flexShrink: 0, color: '#7F899E' }}
            >
              {isExpanded ? <ChevronRightRoundedIcon sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /> : <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />}
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 500 }}>{row.label}</Typography>
              {row.secondary && <Typography noWrap sx={{ fontSize: 10.5, color: '#8A94A6' }}>{row.secondary}</Typography>}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ fontSize: 12.5, fontWeight: 600 }}>{renderValue(row.hours)}</TableCell>
        <TableCell sx={{ width: '32%', minWidth: 150 }}>{renderDistributionBar(row.hours)}</TableCell>
        <TableCell padding="checkbox">{row.project && <ArrowForwardRoundedIcon sx={{ fontSize: 17, color: '#8A94A6' }} />}</TableCell>
      </TableRow>
      {isExpanded && children.map((child) => <TableRow
        key={child.key}
        hover={Boolean(child.project)}
        onClick={() => child.project && onProjectOpen(child.project)}
        sx={{ bgcolor: '#F7F8FA', cursor: child.project ? 'pointer' : 'default', '&:hover': { bgcolor: '#F2F4F7 !important' } }}
      >
        <TableCell sx={{ pl: 6.5, py: 0.75 }}>
          <Typography noWrap sx={{ fontSize: 11.5, color: '#424957' }}>{child.label}</Typography>
          {child.secondary && <Typography noWrap sx={{ fontSize: 10, color: '#98A2B3' }}>{child.secondary}</Typography>}
        </TableCell>
        <TableCell align="right" sx={{ py: 0.75, fontSize: 11.5, fontWeight: 500 }}>{renderValue(child.hours, row.hours)}</TableCell>
        <TableCell sx={{ width: '32%', minWidth: 150, py: 0.75 }}>{renderDistributionBar(child.hours, row.hours, true)}</TableCell>
        <TableCell padding="checkbox">{child.project && <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: '#98A2B3' }} />}</TableCell>
      </TableRow>)}
    </React.Fragment>;
  };

  return <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflow: 'hidden' }}>
    <Box sx={{ minHeight: 52, px: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #E8EBF2' }}>
      <Typography sx={{ mr: 'auto', fontSize: 13, fontWeight: 600, color: '#1D2433' }}>Часы по проектам</Typography>
      <SegmentedCapsule value={viewByUser ? 'users' : 'projects'} onChange={(value) => onViewByUserChange(value === 'users')} options={[{ value: 'projects', label: 'По проектам' }, { value: 'users', label: 'По пользователям' }]} ariaLabel="Группировка таблицы" idPrefix="team-table-group" sx={{ width: 240, height: 30, p: '2px', '& .MuiToggleButton-root': { height: 26, fontSize: 10.5 } }} />
      <SegmentedCapsule value={showPercent ? 'percent' : 'hours'} onChange={(value) => onShowPercentChange(value === 'percent')} options={[{ value: 'hours', label: 'Часы' }, { value: 'percent', label: 'Доля часов' }]} ariaLabel="Значения таблицы" idPrefix="team-table-values" sx={{ width: 148, height: 30, p: '2px', '& .MuiToggleButton-root': { height: 26, fontSize: 10.5 } }} />
    </Box>
    <TableContainer sx={{ flex: 1, minHeight: 0 }}>
      <Table stickyHeader size="small" aria-label="Командная аналитика">
        <TableHead><TableRow>
          <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>{viewByUser ? 'Пользователь' : 'Проект'}</TableCell>
          <TableCell align="right" sx={{ width: 150, fontSize: 11.5, fontWeight: 600 }}>{showPercent ? 'Доля часов' : 'Часы'}</TableCell>
          <TableCell sx={{ width: '32%', minWidth: 150, fontSize: 11.5, fontWeight: 600 }}>Распределение</TableCell>
          <TableCell padding="checkbox" />
        </TableRow></TableHead>
        <TableBody>
          {rows.map(renderPrimaryRow)}
          {!rows.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: '#98A2B3' }}>Нет данных за выбранный период</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>;
}

export default function TeamDashboard({ currentUser, selectedSubject }) {
  const [range, setRange] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [clientType, setClientType] = useState('');
  const [viewByUser, setViewByUser] = useState(false);
  const [showPercent, setShowPercent] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const requestRef = useRef(0);
  const period = useMemo(() => getPeriod(range, anchor), [anchor, range]);
  const scope = selectedSubject === 'team' ? 'company' : 'mine';
  const selectedUserId = selectedSubject === 'team' ? '' : selectedSubject;

  const load = useCallback(() => {
    if (!currentUser?.id) return;
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    const params = { scope, ...period, bucket: getTimeSeriesBucket(range) };
    if (scope === 'mine' && currentUser.role === 'admin') params.userId = selectedUserId;
    if (clientType) params.clientType = clientType;
    axios.get('/api/dashboard', { params })
      .then((response) => { if (requestId === requestRef.current) setData(response.data); })
      .catch((requestError) => { if (requestId === requestRef.current) setError(requestError.response?.data?.error || 'Не удалось загрузить командную аналитику'); })
      .finally(() => { if (requestId === requestRef.current) setLoading(false); });
  }, [clientType, currentUser, period, range, scope, selectedUserId]);

  useEffect(() => { load(); }, [load]);
  const nextDisabled = range === 'all' || moveAnchor(anchor, range, 1) > new Date();

  return <Box role="tabpanel" id="home-team-panel" aria-labelledby="home-team-tab" sx={{ height: '100%', minHeight: 0, containerType: 'inline-size', containerName: 'team-dashboard', display: 'grid', gridTemplateRows: '52px minmax(0, 1fr)', gap: 1.5 }}>
    <Box sx={{ minWidth: 0, px: 1.5, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', alignItems: 'center', columnGap: 1.25, border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, '@container team-dashboard (max-width: 959px)': { display: 'flex' } }}>
      <SegmentedCapsule value={clientType} onChange={setClientType} options={CLIENT_OPTIONS} ariaLabel="Тип клиента" idPrefix="team-client-type" sx={{ width: 240, height: 32, p: '2px', flexShrink: 0, justifySelf: 'start', '& .MuiToggleButton-root': { height: 28, fontSize: 10.5 } }} />
      <Box sx={{ display: 'flex', alignItems: 'center', justifySelf: 'center', flexShrink: 0 }}>
        <IconButton size="small" aria-label="Предыдущий период" disabled={range === 'all'} onClick={() => setAnchor((value) => moveAnchor(value, range, -1))}><ChevronLeftRoundedIcon /></IconButton>
        <Typography sx={{ minWidth: 155, textAlign: 'center', fontSize: 11.5, fontWeight: 500, color: '#424957' }}>{getPeriodLabel(range, anchor)}</Typography>
        <IconButton size="small" aria-label="Следующий период" disabled={nextDisabled} onClick={() => setAnchor((value) => moveAnchor(value, range, 1))}><ChevronRightRoundedIcon /></IconButton>
      </Box>
      <SegmentedCapsule value={range} onChange={setRange} options={RANGE_OPTIONS} ariaLabel="Период командной аналитики" idPrefix="team-period" sx={{ width: 360, height: 32, p: '2px', flexShrink: 0, justifySelf: 'end', '@container team-dashboard (max-width: 959px)': { ml: 'auto' }, '& .MuiToggleButton-root': { height: 28, minWidth: '0 !important', fontSize: 10.5 } }} />
    </Box>
    <Box sx={{ position: 'relative', minHeight: 0, display: 'grid', gridTemplateRows: '232px minmax(0, 1fr)', gap: 1.5, '@container team-dashboard (max-width: 767px)': { overflowY: 'auto', gridTemplateRows: '240px 240px 360px' } }}>
      {error && !data ? <Alert severity="error" action={<Button onClick={load}>Повторить</Button>}>{error}</Alert> : <>
        <Box sx={{ minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(280px, 5fr)', gap: 1.5, '@container team-dashboard (max-width: 767px)': { display: 'contents' } }}>
          {data ? <TimeStructureTrendCard data={data} showRangeControl={false} /> : <Box sx={{ p: 2, border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF' }}><Skeleton /><Skeleton height={150} /></Box>}
          <ClientsCard data={data} />
        </Box>
        <TeamTable data={data} viewByUser={viewByUser} onViewByUserChange={setViewByUser} showPercent={showPercent} onShowPercentChange={setShowPercent} onProjectOpen={setSelectedProject} />
      </>}
      {loading && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', height: 2, zIndex: 5 }} />}
      {loading && !data && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(246,247,249,.45)', zIndex: 4 }}><CircularProgress size={28} /></Box>}
    </Box>
    <ProjectAnalyticsDialog open={Boolean(selectedProject)} project={selectedProject} onClose={() => setSelectedProject(null)} />
  </Box>;
}
