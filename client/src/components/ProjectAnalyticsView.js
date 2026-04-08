import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { useTranslation } from '../i18n/I18nProvider';
import { LeftArrow, RightArrow } from './ArrowIcons';
import ProjectAnalyticsSummary from './ProjectAnalyticsSummary';
import ProjectAnalyticsMembersList from './ProjectAnalyticsMembersList';
import ProjectAnalyticsChart from './ProjectAnalyticsChart';

const MEMBER_COLORS = ['#5673DC', '#FF8A65', '#4DB6AC', '#BA68C8', '#64B5F6', '#81C784', '#F06292', '#A1887F', '#7986CB', '#FFD54F'];

function getRangeBounds(range, anchorDate, daily) {
  const today = endOfDay(new Date());
  const safeAnchor = anchorDate || today;

  if (range === 'all') {
    if (!daily.length) {
      return { start: null, end: null };
    }

    return {
      start: parseISO(daily[0].date),
      end: parseISO(daily[daily.length - 1].date),
    };
  }

  let start = null;
  let end = null;

  if (range === 'week') {
    start = startOfWeek(safeAnchor, { weekStartsOn: 1 });
    end = endOfWeek(safeAnchor, { weekStartsOn: 1 });
  } else if (range === 'month') {
    start = startOfMonth(safeAnchor);
    end = endOfMonth(safeAnchor);
  } else if (range === 'quarter') {
    start = startOfQuarter(safeAnchor);
    end = endOfQuarter(safeAnchor);
  } else if (range === 'year') {
    start = startOfYear(safeAnchor);
    end = endOfYear(safeAnchor);
  }

  if (end && isAfter(end, today)) {
    end = today;
  }

  return { start, end };
}

function shiftAnchorDate(anchorDate, range, direction) {
  if (range === 'week') {
    return addWeeks(anchorDate, direction);
  }

  if (range === 'month') {
    return addMonths(anchorDate, direction);
  }

  if (range === 'quarter') {
    return addQuarters(anchorDate, direction);
  }

  if (range === 'year') {
    return addYears(anchorDate, direction);
  }

  return anchorDate;
}

function getRangeLabel(range, anchorDate, dateLocale, t) {
  if (range === 'all') {
    return t('projects.analytics.ranges.all');
  }

  const { start, end } = getRangeBounds(range, anchorDate, []);
  if (!start || !end) {
    return '';
  }

  if (range === 'week') {
    return `${format(start, 'd MMM', { locale: dateLocale })} - ${format(end, 'd MMM yyyy', { locale: dateLocale })}`;
  }

  if (range === 'month') {
    return format(start, 'LLLL yyyy', { locale: dateLocale });
  }

  if (range === 'quarter') {
    const quarter = Math.floor(start.getMonth() / 3) + 1;
    return `${t('dashboard.quarterLabel', { quarter, year: format(start, 'yyyy') })}`;
  }

  return format(start, 'yyyy');
}

function isNextPeriodInFuture(anchorDate, range) {
  if (range === 'all') {
    return false;
  }

  return isAfter(shiftAnchorDate(anchorDate, range, 1), new Date());
}

function getTopVisibleIds(members) {
  return members.slice(0, 5).map((member) => member.userId);
}

export default function ProjectAnalyticsView({ project, open }) {
  const { t, locale } = useTranslation();
  const dateLocale = locale === 'ru' ? ru : enUS;
  const [range, setRange] = useState('all');
  const [displayMode, setDisplayMode] = useState('cumulative');
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [analyticsData, setAnalyticsData] = useState(null);
  const [totalVisible, setTotalVisible] = useState(true);
  const [visibleUserIds, setVisibleUserIds] = useState([]);
  const [selectionInitialized, setSelectionInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !project?.id) {
      return;
    }

    setRange('all');
    setDisplayMode('cumulative');
    setAnchorDate(new Date());
    setTotalVisible(true);
    setVisibleUserIds([]);
    setSelectionInitialized(false);
  }, [open, project?.id]);

  useEffect(() => {
    if (!open || !project?.id) {
      return;
    }

    let ignore = false;

    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await axios.get(`/api/projects/${project.id}/analytics`, {
          params: {
            range,
            anchorDate: format(anchorDate, 'yyyy-MM-dd'),
          },
        });

        if (ignore) {
          return;
        }

        const data = response.data;
        setAnalyticsData(data);
        const topVisibleIds = getTopVisibleIds(data.members);
        setVisibleUserIds((prev) => {
          if (selectionInitialized) {
            return prev;
          }

          return data.members.length <= 5 ? data.members.map((member) => member.userId) : topVisibleIds;
        });
        setSelectionInitialized(true);
      } catch (fetchError) {
        if (!ignore) {
          setError(t('projects.analytics.errors.fetch'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      ignore = true;
    };
  }, [anchorDate, open, project?.id, range, selectionInitialized, t]);

  const formatHours = (value) => {
    const rounded = Math.round((Number(value) || 0) * 10) / 10;
    return t('dashboard.hoursSuffix', { value: rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1) });
  };

  const getMemberColor = (userId) => {
    const index = analyticsData?.members.findIndex((member) => member.userId === userId) ?? 0;
    return MEMBER_COLORS[(index >= 0 ? index : 0) % MEMBER_COLORS.length];
  };

  const allVisibleIds = analyticsData?.members.map((member) => member.userId) || [];
  const topVisibleIds = analyticsData ? getTopVisibleIds(analyticsData.members) : [];
  const visibleMembers = analyticsData
    ? analyticsData.members.filter((member) => visibleUserIds.includes(member.userId))
    : [];
  const hiddenCount = analyticsData
    ? analyticsData.members.length - visibleMembers.length + (totalVisible ? 0 : 1)
    : 0;

  const buildChartData = () => {
    if (!analyticsData) {
      return [];
    }

    const { start, end } = getRangeBounds(range, anchorDate, analyticsData.daily);
    if (!start || !end) {
      return [];
    }

    const dailyMap = {};
    analyticsData.daily.forEach((point) => {
      dailyMap[point.date] = point;
    });

    const rows = [];
    for (let current = new Date(start); current <= end; current = addDays(current, 1)) {
      const key = format(current, 'yyyy-MM-dd');
      const point = dailyMap[key];
      const row = {
        date: key,
        total: point ? point.totalHours : 0,
      };

      analyticsData.members.forEach((member) => {
        row[`user_${member.userId}`] = 0;
      });

      if (point) {
        point.users.forEach((userPoint) => {
          row[`user_${userPoint.userId}`] = userPoint.hours;
        });
      }

      rows.push(row);
    }

    const baseline = analyticsData.cumulativeBaseline || { totalHours: 0, byUser: {} };
    const runningTotal = Number(baseline.totalHours) || 0;
    let accumulatedTotal = runningTotal;
    const rowsWithTotal = rows.map((row) => {
      const next = { ...row };
      accumulatedTotal += row.total || 0;
      next.total = accumulatedTotal;
      return next;
    });

    if (displayMode === 'daily') {
      return rowsWithTotal;
    }

    const accumulatedByUser = {};

    analyticsData.members.forEach((member) => {
      accumulatedByUser[`user_${member.userId}`] = Number(baseline.byUser?.[member.userId]) || 0;
    });

    return rowsWithTotal.map((row) => {
      const next = { ...row };

      analyticsData.members.forEach((member) => {
        const key = `user_${member.userId}`;
        accumulatedByUser[key] += row[key] || 0;
        next[key] = accumulatedByUser[key];
      });

      return next;
    });
  };

  const chartData = buildChartData();
  const currentRangeLabel = getRangeLabel(range, anchorDate, dateLocale, t);

  const summaryItems = analyticsData
    ? [
        {
          label: t('projects.analytics.participants'),
          value: analyticsData.summary.participantsCount,
        },
        {
          label: t('projects.analytics.totalHours'),
          value: formatHours(analyticsData.summary.totalHours),
          secondary: currentRangeLabel,
        },
        {
          label: t('projects.analytics.averagePerDay'),
          value: formatHours(analyticsData.summary.averagePerDay),
          secondary: currentRangeLabel,
        },
        {
          label: t('projects.analytics.lastActivity'),
          value: analyticsData.summary.lastEntryDate
            ? format(parseISO(analyticsData.summary.lastEntryDate), 'd MMM yyyy', { locale: dateLocale })
            : '-',
        },
      ]
    : [];

  const subtitleParts = [];
  if (analyticsData?.project?.clientName) {
    subtitleParts.push(analyticsData.project.clientName);
  }
  if (analyticsData?.project?.code) {
    subtitleParts.push(analyticsData.project.code);
  }
  const subtitle = subtitleParts.length ? subtitleParts.join(' / ') : t('projects.analytics.noSubtitle');
  const nextPeriodDisabled = isNextPeriodInFuture(anchorDate, range);
  const compactMembersSummary = analyticsData
    ? analyticsData.members.length <= 5
      ? locale === 'ru'
        ? 'Показаны все участники'
        : 'All members visible'
      : locale === 'ru'
        ? `${t('projects.analytics.totalSeries')} + ${t('projects.analytics.topMembers')}`
        : `${t('projects.analytics.totalSeries')} + ${t('projects.analytics.topMembers')}`
    : '';
  const chartSummaryLabel = analyticsData
    ? displayMode === 'cumulative'
      ? locale === 'ru'
        ? `Накоплено: ${formatHours(chartData[chartData.length - 1]?.total || 0)}`
        : `Accumulated: ${formatHours(chartData[chartData.length - 1]?.total || 0)}`
      : locale === 'ru'
        ? `За период: ${formatHours(analyticsData.summary.totalHours)}`
        : `In period: ${formatHours(analyticsData.summary.totalHours)}`
    : '';
  const toolbarButtonSx = (selected, isWide = false, isCompact = false) => ({
    minWidth: isWide ? (isCompact ? 98 : 112) : (isCompact ? 72 : 84),
    height: isCompact ? 34 : 36,
    borderRadius: 2,
    border: selected ? '1.5px solid #5673DC' : '1.5px solid #E2E4E9',
    color: selected ? '#5673DC' : '#222',
    background: selected ? 'rgba(86,115,220,0.06)' : '#f7f8fa',
    fontWeight: 500,
    fontSize: isCompact ? 12 : 13,
    boxShadow: 'none',
    textTransform: 'none',
    whiteSpace: 'nowrap',
    px: isCompact ? 1.5 : 2,
    '&:hover': {
      background: 'rgba(86,115,220,0.10)',
      border: '1.5px solid #5673DC',
      color: '#5673DC',
    },
  });

  const chartLabels = {
    title: t('projects.analytics.chart'),
    total: t('projects.analytics.totalSeries'),
    noData: t('projects.analytics.noData'),
  };

  return (
    <Box
      sx={{
        p: { xs: 0.5, md: 1 },
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={1.25}
        >
          <Box sx={{ minWidth: 0, flex: 1, pr: { md: 2.5 } }}>
            <Typography
              sx={{
                fontWeight: 700,
                color: '#1D2433',
                fontSize: 16,
                lineHeight: 1.15,
                mb: 0.15,
              }}
            >
              {t('projects.analytics.title')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 600,
                color: '#1D2433',
                fontSize: { xs: 15, md: 16 },
                lineHeight: 1.2,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                pr: { md: 1 },
              }}
            >
              {analyticsData?.project?.name || project?.name}
            </Typography>
            <Typography sx={{ color: '#6C7687', mt: 0.25, fontSize: 12.5, lineHeight: 1.2 }}>
              {subtitle}
            </Typography>
          </Box>

          <Box sx={{ pr: { md: 6 }, width: { xs: '100%', md: 'auto' } }} />
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateRows: 'auto auto 1fr',
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
              alignItems: 'center',
              gap: 1.25,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', lg: 'flex-start' },
                minWidth: 0,
                gap: 1,
                flexWrap: 'wrap',
              }}
            >
              {['daily', 'cumulative'].map((value) => (
                <Button
                  key={value}
                  variant={displayMode === value ? 'outlined' : 'text'}
                  onClick={() => setDisplayMode(value)}
                  sx={toolbarButtonSx(displayMode === value, value === 'cumulative', true)}
                >
                  {t(`projects.analytics.modes.${value}`)}
                </Button>
              ))}
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', lg: 'center' },
                minWidth: 0,
              }}
            >
              {range !== 'all' ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <IconButton
                    onClick={() => setAnchorDate((prev) => shiftAnchorDate(prev, range, -1))}
                  >
                    <LeftArrow color="#5673DC" size={32} />
                  </IconButton>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      minWidth: 180,
                      textAlign: 'center',
                      display: 'inline-block',
                      color: '#1D2433',
                    }}
                  >
                    {currentRangeLabel}
                  </Typography>
                  <IconButton
                    onClick={() => setAnchorDate((prev) => shiftAnchorDate(prev, range, 1))}
                    disabled={nextPeriodDisabled}
                    sx={{ color: nextPeriodDisabled ? '#C5C9D3' : '#5673DC' }}
                  >
                    <RightArrow color={nextPeriodDisabled ? '#C5C9D3' : '#5673DC'} size={32} />
                  </IconButton>
                </Box>
              ) : (
                <Typography
                  variant="subtitle1"
                  sx={{
                    minWidth: 180,
                    textAlign: 'center',
                    display: 'inline-block',
                    color: '#1D2433',
                  }}
                >
                  {currentRangeLabel}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                gap: 0.75,
                flexWrap: 'wrap',
              }}
            >
              {['week', 'month', 'quarter', 'year', 'all'].map((value) => (
                <Button
                  key={value}
                  variant={range === value ? 'outlined' : 'text'}
                  onClick={() => setRange(value)}
                  sx={toolbarButtonSx(range === value, value === 'all', true)}
                >
                  {t(`projects.analytics.ranges.${value}`)}
                </Button>
              ))}
            </Box>
          </Box>

          {loading ? (
            <Box sx={{ py: 5, minHeight: 120, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : null}

          {!loading && error ? <Alert severity="error">{error}</Alert> : null}

          {!loading && !error && analyticsData ? (
            <>
            <ProjectAnalyticsSummary items={summaryItems} />

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: '256px minmax(0, 1fr)' },
                  gap: 1.5,
                  alignItems: 'stretch',
                  minHeight: 0,
                }}
              >
                <Box sx={{ order: { xs: 2, md: 1 }, minWidth: 0, minHeight: 0 }}>
                  <ProjectAnalyticsMembersList
                    members={analyticsData.members}
                    totalVisible={totalVisible}
                    onToggleTotal={() => setTotalVisible((prev) => !prev)}
                    visibleUserIds={visibleUserIds}
                    onToggleUser={(userId) => {
                      setVisibleUserIds((prev) =>
                        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
                      );
                    }}
                    onShowAll={() => {
                      setTotalVisible(true);
                      setVisibleUserIds(allVisibleIds);
                    }}
                    onHideAll={() => {
                      setTotalVisible(false);
                      setVisibleUserIds([]);
                    }}
                    onShowTop={() => {
                      setTotalVisible(true);
                      setVisibleUserIds(analyticsData.members.length <= 5 ? allVisibleIds : topVisibleIds);
                    }}
                    hiddenCount={hiddenCount}
                    getMemberColor={getMemberColor}
                    formatHours={formatHours}
                    summaryText={compactMembersSummary}
                    title={t('projects.analytics.members')}
                    totalLabel={t('projects.analytics.totalSeries')}
                    totalHours={analyticsData.summary.totalHours}
                    totalColor="#1F3A5F"
                    actions={{
                      showAll: locale === 'ru' ? 'Все' : 'All',
                      hideAll: locale === 'ru' ? 'Скрыть' : 'Hide',
                      showTop: t('projects.analytics.topMembers'),
                      hidden: (count) => t('projects.analytics.hiddenMembers', { count }),
                    }}
                  />
                </Box>

                <Box sx={{ order: { xs: 1, md: 2 }, minWidth: 0, minHeight: 0 }}>
                  <ProjectAnalyticsChart
                    chartData={chartData}
                    totalVisible={totalVisible}
                    visibleMembers={visibleMembers}
                    getMemberColor={getMemberColor}
                    formatHours={formatHours}
                    formatAxisDate={(dateValue) => format(parseISO(dateValue), 'd MMM', { locale: dateLocale })}
                    formatTooltipDate={(dateValue) => format(parseISO(dateValue), 'd MMMM yyyy', { locale: dateLocale })}
                    labels={chartLabels}
                    locale={locale}
                    summaryLabel={chartSummaryLabel}
                  />
                </Box>
              </Box>
            </>
          ) : null}
        </Box>
      </Stack>
    </Box>
  );
}
