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
import { enUS, ru } from 'date-fns/locale';
import SegmentedCapsule from './SegmentedCapsule';
import { TimeStructureTrendCard } from './MineTimeAnalytics';
import TeamWeeklyOverview from './TeamWeeklyOverview';
import ContractEffortTornadoChart from './ContractEffortTornadoChart';
import { useTranslation } from '../i18n/I18nProvider';
import { getProjectCategoryChipStyles, getProjectCategoryLabel, getProjectCategoryTagStyles } from '../utils/projectCategories';

const getRangeOptions = (t) => ['week', 'month', 'quarter', 'year', 'all'].map((value) => ({ value, label: t(`analytics.ranges.${value}`) }));

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatHours = (value, locale = 'ru') => Number(value || 0).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 });

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

function getPeriodLabel(range, anchor, locale, t) {
  if (range === 'all') return t('analytics.period.all');
  const dateLocale = locale === 'en' ? enUS : ru;
  if (range === 'week') {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return `${format(start, 'd MMM', { locale: dateLocale })} — ${format(addDays(start, 6), 'd MMM yyyy', { locale: dateLocale })}`;
  }
  if (range === 'quarter') return t('analytics.period.quarter', { quarter: Math.floor(anchor.getMonth() / 3) + 1, year: anchor.getFullYear() });
  if (range === 'year') return String(anchor.getFullYear());
  return format(anchor, 'LLLL yyyy', { locale: dateLocale });
}

function getTimeSeriesBucket(range) {
  if (range === 'week') return 'day';
  if (range === 'month') return 'week';
  if (range === 'all') return 'quarter';
  return 'month';
}

function ClientsCard({ data, selectedCategory, selectedClient, onClientChange }) {
  const { t, locale } = useTranslation();
  const groups = useMemo(() => {
    const map = new Map();
    (data?.projects || []).forEach((item) => {
      const project = item.project || {};
      if (selectedCategory && project.category !== selectedCategory) return;
      if (!project.clientName) return;
      const clientType = project.clientType || 'external';
      const key = `${clientType}\u0000${project.clientName}`;
      const current = map.get(key) || { key, label: project.clientName, clientType, hours: 0 };
      current.hours += Number(item.periodHours || 0);
      map.set(key, current);
    });
    return ['external', 'internal'].map((key) => ({
      key,
      label: t(`analytics.clients.${key}`),
      items: [...map.values()].filter((item) => item.clientType === key).sort((a, b) => Number(b.hours || 0) - Number(a.hours || 0)),
    })).filter((group) => group.items.length);
  }, [data, selectedCategory, t]);
  const maximum = Math.max(1, ...groups.flatMap((group) => group.items.map((item) => Number(item.hours || 0))));

  return <Box sx={{ height: '100%', minHeight: 0, p: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflow: 'hidden' }}>
    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1D2433', mb: 1 }}>{t('analytics.clients.title')}</Typography>
    <Box sx={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pr: 1.25, scrollbarGutter: 'stable' }}>
      {groups.map((group, groupIndex) => <Box key={group.key} sx={{ mb: 1.25 }}>
        <Typography sx={{ mb: 0.6, fontSize: 10.5, fontWeight: 600, color: '#7A8496' }}>{group.label}</Typography>
        {group.items.map((item, itemIndex) => {
          const selected = selectedClient?.key === item.key;
          return <Box
            key={item.key}
            role="button"
            tabIndex={0}
            aria-label={t('analytics.clients.filterAria', { client: item.label })}
            aria-pressed={selected}
            data-client-filter={item.label}
            data-client-tour-filter={groupIndex === 0 && itemIndex === 0 ? 'true' : undefined}
            onClick={() => onClientChange?.(selected ? null : item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClientChange?.(selected ? null : item);
              }
            }}
            sx={{ mb: 0.65, px: 0.4, py: 0.25, mx: -0.4, borderRadius: 1, cursor: 'pointer', outline: 0, bgcolor: selected ? '#EEF0FC' : 'transparent', '&:hover': { bgcolor: selected ? '#E4E8FA' : '#F7F8FA' }, '&:focus-visible': { outline: '2px solid #4A68D9', outlineOffset: 1 } }}
          >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Tooltip title={item.label} arrow><Typography noWrap sx={{ minWidth: 0, fontSize: 10.8, color: '#424957' }}>{item.label}</Typography></Tooltip>
            <Typography sx={{ flexShrink: 0, fontSize: 10.8, fontWeight: 600 }}>{formatHours(item.hours, locale)} {t('mineAnalytics.hoursSuffix')}</Typography>
          </Box>
          <Box sx={{ mt: 0.25, height: 4, borderRadius: 999, bgcolor: '#EEF1F8', overflow: 'hidden' }}>
            <Box sx={{ width: `${(Number(item.hours || 0) / maximum) * 100}%`, height: '100%', borderRadius: 999, bgcolor: '#7890E3' }} />
          </Box>
        </Box>;
        })}
      </Box>)}
      {!groups.length && <Box sx={{ height: '100%', display: 'grid', placeItems: 'center' }}><Typography sx={{ fontSize: 12, color: '#98A2B3' }}>{t('analytics.projects.noData')}</Typography></Box>}
    </Box>
  </Box>;
}

export function getPayrollUsageDisplay(payrollUsage, { t = null, locale = 'ru' } = {}) {
  if (!payrollUsage?.hasPayrollLimit) {
    return { value: '—', tone: 'muted', label: t ? t('analytics.payroll.noLimit') : 'Лимит ФОТ не настроен', incomplete: false };
  }
  const usedPercent = Number(payrollUsage.usedPercent || 0);
  const threshold = Number(payrollUsage.warningThresholdPercent || 80);
  const tone = usedPercent >= 100 ? 'critical' : usedPercent >= threshold ? 'warning' : 'normal';
  return {
    value: `${usedPercent.toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 })}%`,
    tone,
    label: t ? t('analytics.payroll.used', { percent: usedPercent.toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 }) }) : `Использовано лимита ФОТ: ${usedPercent.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}%`,
    incomplete: payrollUsage.isComplete === false,
  };
}

function PayrollUsageCell({ payrollUsage }) {
  const { t, locale } = useTranslation();
  const display = getPayrollUsageDisplay(payrollUsage, { t, locale });
  const color = display.tone === 'critical' ? '#D80000' : display.tone === 'warning' ? '#B54708' : display.tone === 'muted' ? '#98A2B3' : '#344054';
  const tooltip = display.incomplete ? `${display.label}. ${t('analytics.payroll.incomplete')}` : display.label;
  return <Tooltip title={tooltip} arrow>
    <Box
      data-payroll-usage-status={display.tone}
      aria-label={tooltip}
      sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.35, color, cursor: 'help' }}
    >
      <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 400, color: 'inherit' }}>{display.value}</Typography>
    </Box>
  </Tooltip>;
}

function TeamTable({ data, onProjectOpen, selectedCategory, onClearCategory, selectedClient, onClearClient }) {
  const { t, locale } = useTranslation();
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const total = Number(data?.summary?.totalHours || 0);
  const projectRows = useMemo(() => (data?.projects || []).map((item) => ({
      key: `project-${item.project.id}`,
      label: [item.project.code, item.project.name].filter(Boolean).join(' — '),
      secondary: item.project.clientName,
      hours: Number(item.periodHours || 0),
      project: item.project,
      payrollUsage: item.payrollUsage,
    })), [data]);
  const detailRows = useMemo(() => data?.breakdowns?.projectUsers || [], [data]);
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
  const filteredProjectRows = useMemo(
    () => projectRows.filter((row) => {
      if (selectedCategory && row.project.category !== selectedCategory) return false;
      return !selectedClient || `${row.project.clientType || ''}\u0000${row.project.clientName || ''}` === selectedClient.key;
    }),
    [projectRows, selectedCategory, selectedClient]
  );
  const rows = filteredProjectRows;

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [data?.period?.startDate, data?.period?.endDate, selectedCategory, selectedClient]);

  const toggleExpanded = (key) => {
    setExpandedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderPercent = (hours, parentTotal = total) => `${parentTotal ? Math.round((hours / parentTotal) * 100) : 0}%`;

  const renderDistributionBar = (hours, parentTotal = total, nested = false) => {
    const percent = parentTotal > 0 ? Math.min(100, Math.max(0, (hours / parentTotal) * 100)) : 0;
    return <Box
      role="progressbar"
      aria-label={t('analytics.projects.distributionAria', { percent: Math.round(percent) })}
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
    const children = detailsByProject.get(String(row.project.id)) || [];
    return <React.Fragment key={row.key}>
      <TableRow data-product-tour={row.project ? 'project-row' : undefined} hover onClick={() => row.project && onProjectOpen(row.project)} sx={{ cursor: row.project ? 'pointer' : 'default' }}>
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <IconButton
              size="small"
              aria-label={isExpanded
                ? t('analytics.projects.collapse', { project: row.label })
                : t('analytics.projects.expand', { project: row.label })}
              aria-expanded={isExpanded}
              onClick={(event) => { event.stopPropagation(); toggleExpanded(row.key); }}
              sx={{ width: 28, height: 28, mr: 0.5, flexShrink: 0, color: '#7F899E' }}
            >
              {isExpanded ? <ChevronRightRoundedIcon sx={{ fontSize: 18, transform: 'rotate(90deg)' }} /> : <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />}
            </IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 500 }}>{row.label}</Typography>
              {row.project && <Box sx={{ mt: 0.25, display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                <Box
                  data-project-category-tag={row.project.category || 'unclassified'}
                  sx={{
                    ...getProjectCategoryTagStyles(row.project.category),
                    px: 0.55,
                    py: '1px',
                    borderRadius: '4px',
                    flexShrink: 0,
                    maxWidth: '58%',
                  }}
                >
                  <Typography noWrap sx={{ fontSize: 9, lineHeight: '12px', fontWeight: 500, color: 'inherit' }}>
                    {getProjectCategoryLabel(row.project.category, t)}
                  </Typography>
                </Box>
                {row.secondary && <Typography noWrap sx={{ minWidth: 0, fontSize: 10.5, color: '#8A94A6' }}>{row.secondary}</Typography>}
              </Box>}
            </Box>
          </Box>
        </TableCell>
        <TableCell sx={{ width: 132, maxWidth: 160 }}>
          <Tooltip title={row.project.managerName || t('projects.manager.unassigned')} arrow>
            <Typography noWrap sx={{ fontSize: 11.5, color: '#667085', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {row.project.managerName || t('projects.manager.unassigned')}
            </Typography>
          </Tooltip>
        </TableCell>
        <TableCell align="right" sx={{ width: 100, fontSize: 12.5, fontWeight: 400 }}>{formatHours(row.hours, locale)} {t('mineAnalytics.hoursSuffix')}</TableCell>
        <TableCell align="right" sx={{ width: 76, fontSize: 12.5, fontWeight: 500, color: '#667085' }}>{renderPercent(row.hours)}</TableCell>
        <TableCell align="right" sx={{ width: 92 }}><PayrollUsageCell payrollUsage={row.payrollUsage} /></TableCell>
        <TableCell sx={{ width: '18%', minWidth: 105 }}>{renderDistributionBar(row.hours)}</TableCell>
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
        <TableCell sx={{ width: 132, py: 0.75 }} />
        <TableCell align="right" sx={{ width: 100, py: 0.75, fontSize: 11.5, fontWeight: 500 }}>{formatHours(child.hours, locale)} {t('mineAnalytics.hoursSuffix')}</TableCell>
        <TableCell align="right" sx={{ width: 76, py: 0.75, fontSize: 11.5, fontWeight: 500, color: '#667085' }}>{renderPercent(child.hours, row.hours)}</TableCell>
        <TableCell sx={{ width: 92, py: 0.75 }} />
        <TableCell sx={{ width: '18%', minWidth: 105, py: 0.75 }}>{renderDistributionBar(child.hours, row.hours, true)}</TableCell>
        <TableCell padding="checkbox">{child.project && <ArrowForwardRoundedIcon sx={{ fontSize: 16, color: '#98A2B3' }} />}</TableCell>
      </TableRow>)}
    </React.Fragment>;
  };

  return <Box data-product-tour="projects" sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflow: 'hidden' }}>
    <Box sx={{ minHeight: 52, px: 1.5, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #E8EBF2' }}>
      <Typography sx={{ mr: 'auto', fontSize: 13, fontWeight: 600, color: '#1D2433' }}>{t('analytics.projects.title')}</Typography>
      {selectedCategory && <Button
        size="small"
        variant="text"
        onClick={onClearCategory}
        aria-label={t('analytics.projects.clearCategory')}
        data-selected-project-category={selectedCategory}
        sx={{ minWidth: 0, height: 22, px: 0.8, borderRadius: '6px', fontSize: 10.5, fontWeight: 400, lineHeight: 1.2, textTransform: 'none', whiteSpace: 'nowrap', ...getProjectCategoryChipStyles(selectedCategory), '&:hover': { filter: 'brightness(.97)' } }}
      >
        {getProjectCategoryLabel(selectedCategory, t)} ×
      </Button>}
      {selectedClient && <Button
        size="small"
        variant="text"
        onClick={onClearClient}
        aria-label={t('analytics.projects.clearClient')}
        data-selected-project-client={selectedClient.label}
        sx={{ minWidth: 0, height: 22, px: 0.8, borderRadius: '6px', fontSize: 10.5, fontWeight: 400, lineHeight: 1.2, textTransform: 'none', whiteSpace: 'nowrap', ...getProjectCategoryChipStyles('internal_project'), '&:hover': { filter: 'brightness(.97)' } }}
      >
        {selectedClient.label} ×
      </Button>}
    </Box>
    <TableContainer sx={{ flex: 1, minHeight: 0 }}>
      <Table data-team-analytics-table="true" stickyHeader size="small" aria-label={t('teamWeekly.views.analytics')}>
        <TableHead><TableRow>
          <TableCell sx={{ fontSize: 11.5, fontWeight: 600 }}>{t('analytics.projects.project')}</TableCell>
          <TableCell sx={{ width: 132, fontSize: 11.5, fontWeight: 600 }}>{t('analytics.projects.manager')}</TableCell>
          <TableCell align="right" sx={{ width: 100, fontSize: 11.5, fontWeight: 600 }}>{t('analytics.projects.hours')}</TableCell>
          <TableCell align="right" sx={{ width: 76, fontSize: 11.5, fontWeight: 600 }}>{t('analytics.projects.percent')}</TableCell>
          <TableCell align="right" sx={{ width: 92, fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap' }}>
            <Tooltip title={t('analytics.projects.payrollTitle')} arrow><span>{t('analytics.projects.payroll')}</span></Tooltip>
          </TableCell>
          <TableCell sx={{ width: '18%', minWidth: 105, fontSize: 11.5, fontWeight: 600 }}>{t('analytics.projects.distribution')}</TableCell>
          <TableCell padding="checkbox" />
        </TableRow></TableHead>
        <TableBody>
          {rows.map(renderPrimaryRow)}
          {!rows.length && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: '#98A2B3' }}>{t('analytics.projects.noData')}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>;
}

function TeamAnalyticsDashboard({ currentUser, selectedSubject, range, anchor, onOpenProject }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
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
    axios.get('/api/dashboard', { params })
      .then((response) => { if (requestId === requestRef.current) setData(response.data); })
      .catch((requestError) => { if (requestId === requestRef.current) setError(requestError.response?.data?.error || t('analytics.dashboardLoadError')); })
      .finally(() => { if (requestId === requestRef.current) setLoading(false); });
  }, [currentUser, period, range, scope, selectedUserId, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    setSelectedCategory(null);
    setSelectedClient(null);
  }, [selectedSubject, period.endDate, period.startDate]);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
    setSelectedClient(null);
  }, []);

  const handleClientChange = useCallback((client) => {
    setSelectedClient(client);
  }, []);

  return <Box role="tabpanel" id="home-team-panel" aria-labelledby="home-team-tab" sx={{ height: '100%', minHeight: 0, containerType: 'inline-size', containerName: 'team-dashboard' }}>
    <Box sx={{ position: 'relative', height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: '232px minmax(0, 1fr)', gap: 1.5, '@container team-dashboard (max-width: 767px)': { overflowY: 'auto', gridTemplateRows: '240px 240px 240px 360px' } }}>
      {error && !data ? <Alert severity="error" action={<Button onClick={load}>{t('mineAnalytics.retry')}</Button>}>{error}</Alert> : <>
        <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 4.6fr) minmax(270px, 3.8fr) minmax(320px, 4.25fr)', gap: 1.5, '@container team-dashboard (max-width: 767px)': { display: 'contents' } }}>
          <Box data-product-tour="time-structure" sx={{ minWidth: 0, minHeight: 0, height: '100%' }}>{data ? <TimeStructureTrendCard data={data} showRangeControl={false} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} /> : <Box sx={{ height: '100%', p: 2, border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF' }}><Skeleton /><Skeleton height={150} /></Box>}</Box>
          <Box data-product-tour="clients" sx={{ minWidth: 0, minHeight: 0, height: '100%' }}><ClientsCard data={data} selectedCategory={selectedCategory} selectedClient={selectedClient} onClientChange={handleClientChange} /></Box>
          {data ? <ContractEffortTornadoChart projects={data.contractComparisonProjects} onProjectOpen={onOpenProject} /> : <Box sx={{ p: 2, border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF' }}><Skeleton /><Skeleton height={150} /></Box>}
        </Box>
        <TeamTable data={data} onProjectOpen={(project) => onOpenProject?.(project.id)} selectedCategory={selectedCategory} onClearCategory={() => handleCategoryChange(null)} selectedClient={selectedClient} onClearClient={() => setSelectedClient(null)} />
      </>}
      {loading && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', height: 2, zIndex: 5 }} />}
      {loading && !data && <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', bgcolor: 'rgba(246,247,249,.45)', zIndex: 4 }}><CircularProgress size={28} /></Box>}
    </Box>
  </Box>;
}

export default function TeamDashboard({ currentUser, selectedSubject, teamView = 'analytics', onTeamViewChange, onOpenTimesheet, onOpenProject }) {
  const { t, locale } = useTranslation();
  const [range, setRange] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [completionYear, setCompletionYear] = useState(new Date().getFullYear());
  const completionActive = teamView === 'completion';
  const nextDisabled = completionActive
    ? completionYear >= new Date().getFullYear()
    : range === 'all' || moveAnchor(anchor, range, 1) > new Date();
  const periodLabel = completionActive ? String(completionYear) : getPeriodLabel(range, anchor, locale, t);

  const viewOptions = [
    { value: 'completion', label: t('teamWeekly.views.completion'), tour: 'completion-tab' },
    { value: 'analytics', label: t('teamWeekly.views.analytics'), tour: 'analytics-tab' },
  ];
  const displayedRangeOptions = completionActive
    ? getRangeOptions(t).map((option) => option.value === 'year'
      ? option
      : { ...option, disabled: true, tooltip: t('analytics.period.completionOnlyYear') })
    : getRangeOptions(t);

  return <Box sx={{ height: '100%', minHeight: 0, display: 'grid', gridTemplateRows: '52px minmax(0, 1fr)', gap: 1.5, containerType: 'inline-size', containerName: 'team-dashboard' }}>
    <Box data-team-control-bar="true" sx={{ minWidth: 0, px: 1.5, display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) auto minmax(320px, 1fr)', alignItems: 'center', columnGap: 1.25, border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' }, '@container team-dashboard (max-width: 959px)': { display: 'flex' } }}>
      <SegmentedCapsule value={completionActive ? 'year' : range} onChange={(value) => { if (!completionActive) setRange(value); }} options={displayedRangeOptions} ariaLabel={t('analytics.period.selector')} idPrefix="team-period" sx={{ width: 360, height: 32, p: '2px', flexShrink: 0, justifySelf: 'start', '& .MuiToggleButton-root': { height: 28, minWidth: '0 !important', fontSize: 10.5 } }} />
      <Box data-team-period-navigation="true" sx={{ display: 'flex', alignItems: 'center', justifySelf: 'center', flexShrink: 0 }}>
        <IconButton size="small" aria-label={t('analytics.period.previous')} disabled={!completionActive && range === 'all'} onClick={() => completionActive ? setCompletionYear((value) => value - 1) : setAnchor((value) => moveAnchor(value, range, -1))}><ChevronLeftRoundedIcon /></IconButton>
        <Typography sx={{ minWidth: 155, textAlign: 'center', fontSize: 11.5, fontWeight: 500, color: '#424957' }}>{periodLabel}</Typography>
        <IconButton size="small" aria-label={t('analytics.period.next')} disabled={nextDisabled} onClick={() => completionActive ? setCompletionYear((value) => value + 1) : setAnchor((value) => moveAnchor(value, range, 1))}><ChevronRightRoundedIcon /></IconButton>
      </Box>
      <Box data-product-tour="team-view" sx={{ justifySelf: 'end' }}><SegmentedCapsule value={teamView} onChange={onTeamViewChange} options={viewOptions} ariaLabel={t('teamWeekly.views.aria')} idPrefix="team-view" sx={{ width: 320, height: 32, p: '2px', flexShrink: 0, justifySelf: 'end', '& .MuiToggleButton-root': { height: 28, fontSize: 11 } }} /></Box>
    </Box>
    {completionActive
      ? <TeamWeeklyOverview year={completionYear} onOpenTimesheet={onOpenTimesheet} currentUser={currentUser} />
      : <TeamAnalyticsDashboard currentUser={currentUser} selectedSubject={selectedSubject} range={range} anchor={anchor} onOpenProject={onOpenProject} />}
  </Box>;
}
