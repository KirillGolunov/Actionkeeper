import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Popover,
  Skeleton,
  Stack,
  Tooltip as MuiTooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axios from 'axios';
import { addDays, format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from '../i18n/I18nProvider';
import { projectCardSurfaceSx } from '../utils/projectCardSurface';
import {
  projectOverviewChartHeaderSx,
  projectOverviewChartSurfaceSx,
  projectOverviewChartViewportSx,
  projectOverviewContentSx,
  projectOverviewEmptySx,
  projectOverviewHeaderSx,
  projectOverviewKpiCardSx,
  projectOverviewTypography,
} from '../utils/projectOverviewLayout';

const MEMBER_COLORS = ['#5673DC', '#FF8A65', '#4DB6AC', '#BA68C8', '#64B5F6', '#81C784', '#F06292', '#A1887F', '#7986CB', '#D6A62E'];

function formatHoursValue(value, t) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return t('dashboard.hoursSuffix', { value: rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1) });
}

function buildCumulativeData(analytics) {
  const daily = [...(analytics?.daily || [])].sort((left, right) => left.date.localeCompare(right.date));
  if (daily.length === 0) return [];

  const dailyByDate = new Map(daily.map((point) => [point.date, point]));
  const runningByUser = {};
  (analytics.members || []).forEach((member) => {
    runningByUser[member.userId] = 0;
  });

  let runningTotal = 0;
  const result = [];
  const end = parseISO(daily[daily.length - 1].date);
  for (let current = parseISO(daily[0].date); current <= end; current = addDays(current, 1)) {
    const dateKey = format(current, 'yyyy-MM-dd');
    const point = dailyByDate.get(dateKey);
    if (point) {
      runningTotal += Number(point.totalHours) || 0;
      (point.users || []).forEach((userPoint) => {
        const userId = userPoint.userId;
        runningByUser[userId] = (Number(runningByUser[userId]) || 0) + (Number(userPoint.hours) || 0);
      });
    }
    const row = { date: dateKey, total: runningTotal };
    (analytics.members || []).forEach((member) => {
      row[`user_${member.userId}`] = Number(runningByUser[member.userId]) || 0;
    });
    result.push(row);
  }
  return result;
}

function SummaryCard({ label, value }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        ...projectCardSurfaceSx,
        ...projectOverviewKpiCardSx,
        cursor: 'default',
      }}
    >
      <Typography sx={{ ...projectOverviewTypography.kpiLabel, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Typography>
      <Typography title={String(value)} sx={{ ...projectOverviewTypography.kpiValue, mt: 0.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {value}
      </Typography>
    </Paper>
  );
}

function LegendItem({ color, label, strong = false }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ minWidth: 0 }}>
      <Box sx={{ width: 18, borderTop: `${strong ? 3 : 2}px solid ${color}`, flexShrink: 0 }} />
      <Typography title={label} sx={{ color: '#5F6B7C', fontSize: 11.5, fontWeight: strong ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export default function ProjectHoursOverview({ project, active }) {
  const { t, locale } = useTranslation();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dateLocale = locale === 'ru' ? ru : enUS;
  const [analytics, setAnalytics] = React.useState(null);
  const [loadedProjectId, setLoadedProjectId] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [legendAnchor, setLegendAnchor] = React.useState(null);

  React.useEffect(() => {
    if (!active || !project?.id || Number(loadedProjectId) === Number(project.id)) return undefined;
    let ignore = false;
    setLoading(true);
    setError(null);
    axios.get(`/api/projects/${project.id}/analytics`, { params: { range: 'all' } })
      .then((response) => {
        if (ignore) return;
        setAnalytics(response.data);
        setLoadedProjectId(project.id);
      })
      .catch(() => {
        if (!ignore) setError(t('projects.analytics.errors.fetch'));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [active, loadedProjectId, project?.id, t]);

  const chartData = React.useMemo(() => buildCumulativeData(analytics), [analytics]);
  const members = analytics?.members || [];
  const summary = analytics?.summary;
  const cards = summary ? [
    { label: t('projects.analytics.participants'), value: summary.participantsCount },
    { label: t('projects.analytics.totalHours'), value: formatHoursValue(summary.totalHours, t) },
    { label: t('projects.analytics.averagePerDay'), value: formatHoursValue(summary.averagePerDay, t) },
    {
      label: t('projects.analytics.lastActivity'),
      value: summary.lastEntryDate ? format(parseISO(summary.lastEntryDate), 'd MMM yyyy', { locale: dateLocale }) : '—',
    },
  ] : [];

  const CustomTooltip = ({ active: tooltipActive, payload, label }) => {
    if (!tooltipActive || !payload?.length) return null;
    const rows = [...payload]
      .filter((entry) => entry.dataKey === 'total' || Number(entry.value) > 0)
      .sort((left, right) => (Number(right.value) || 0) - (Number(left.value) || 0));
    return (
      <Paper elevation={0} sx={{ p: 1.1, minWidth: 220, maxWidth: 330, borderRadius: '12px', border: '1px solid #DDE3EC', boxShadow: '0 10px 28px rgba(31,58,95,.12)' }}>
        <Typography sx={{ color: '#6C7687', fontSize: 11.5, mb: 0.7 }}>
          {format(parseISO(label), 'd MMMM yyyy', { locale: dateLocale })}
        </Typography>
        <Box sx={{ maxHeight: 220, overflowY: 'auto', pr: 0.5, scrollbarWidth: 'thin' }}>
          <Stack spacing={0.5}>
            {rows.map((entry) => (
              <Stack key={entry.dataKey} direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={0.65} sx={{ minWidth: 0 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                  <Typography sx={{ color: '#1D2433', fontSize: 12, fontWeight: entry.dataKey === 'total' ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.name}
                  </Typography>
                </Stack>
                <Typography sx={{ color: '#1D2433', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {formatHoursValue(entry.value, t)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Paper>
    );
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        ...projectCardSurfaceSx,
        p: { xs: 1.25, sm: 1.5 },
        minWidth: 0,
        height: { lg: '100%' },
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'default',
      }}
    >
      <Box sx={projectOverviewHeaderSx}>
        <Typography component="h3" sx={projectOverviewTypography.sectionTitle}>
          {t('projects.hoursOverview.title')}
        </Typography>
      </Box>

      {loading && !analytics ? (
        <Stack spacing={1} sx={projectOverviewContentSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 0.75 }}>
            {[0, 1, 2, 3].map((item) => (
              <Paper key={item} variant="outlined" sx={{ ...projectCardSurfaceSx, ...projectOverviewKpiCardSx, cursor: 'default' }}>
                <Skeleton variant="text" width="58%" height={15} />
                <Skeleton variant="text" width="72%" height={22} sx={{ mt: 0.15 }} />
              </Paper>
            ))}
          </Box>
          <Paper variant="outlined" sx={projectOverviewChartSurfaceSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={projectOverviewChartHeaderSx}>
              <Skeleton variant="text" width={150} height={22} />
              <Skeleton variant="circular" width={24} height={24} />
            </Stack>
            <Box sx={{ ...projectOverviewChartViewportSx, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={28} />
            </Box>
          </Paper>
        </Stack>
      ) : null}
      {!loading && error ? <Alert severity="error">{error}</Alert> : null}
      {!loading && !error && analytics ? (
        <Stack spacing={1} sx={projectOverviewContentSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 0.75 }}>
            {cards.map((card) => <SummaryCard key={card.label} {...card} />)}
          </Box>

          <Paper variant="outlined" sx={projectOverviewChartSurfaceSx}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={projectOverviewChartHeaderSx}>
              <Typography sx={projectOverviewTypography.chartTitle}>
                {t('projects.hoursOverview.chartTitle')}
              </Typography>
              <MuiTooltip title={t('projects.hoursOverview.legend')}>
                <IconButton
                  size="small"
                  aria-label={t('projects.hoursOverview.legend')}
                  aria-haspopup="dialog"
                  aria-expanded={Boolean(legendAnchor)}
                  onClick={(event) => setLegendAnchor(event.currentTarget)}
                  sx={{ color: '#697386', p: 0.35 }}
                >
                  <InfoOutlinedIcon fontSize="small" />
                </IconButton>
              </MuiTooltip>
            </Stack>

            <Popover
              open={Boolean(legendAnchor)}
              anchorEl={legendAnchor}
              onClose={() => setLegendAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{ sx: { p: 1.25, mt: 0.5, width: 260, maxWidth: 'calc(100vw - 32px)', maxHeight: 320, overflowY: 'auto', borderRadius: 2, border: '1px solid #D6DEF0', boxShadow: '0 12px 28px rgba(90,112,184,0.16)' } }}
            >
              <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>{t('projects.hoursOverview.legend')}</Typography>
              <Stack spacing={0.75}>
                <LegendItem color="#1F3A5F" label={t('projects.analytics.totalSeries')} strong />
                {members.map((member, index) => (
                  <LegendItem key={member.userId} color={MEMBER_COLORS[index % MEMBER_COLORS.length]} label={member.userName} />
                ))}
              </Stack>
            </Popover>

            {chartData.length === 0 ? (
              <Box sx={{ ...projectOverviewEmptySx, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
                <Box>
                  <Typography sx={{ fontWeight: 700, color: '#334155' }}>{t('projects.hoursOverview.emptyTitle')}</Typography>
                  <Typography sx={{ color: '#7A8699', fontSize: 12.5, mt: 0.4 }}>{t('projects.hoursOverview.emptyHint')}</Typography>
                </Box>
              </Box>
            ) : (
              <Box
                role="img"
                tabIndex={0}
                aria-label={t('projects.hoursOverview.ariaLabel', { hours: formatHoursValue(summary.totalHours, t), participants: summary.participantsCount })}
                sx={{ ...projectOverviewChartViewportSx, '&:focus-visible': { outline: '3px solid rgba(86,115,220,.28)', outlineOffset: 2 } }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: mobile ? 5 : 16, left: mobile ? -12 : 2, bottom: 2 }}>
                    <CartesianGrid stroke="#EEF1F6" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(value) => format(parseISO(value), mobile ? 'dd.MM' : 'd MMM', { locale: dateLocale })} tick={{ fill: '#6C7687', fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: '#D9DEE7' }} minTickGap={mobile ? 52 : 32} />
                    <YAxis tickFormatter={(value) => formatHoursValue(value, t)} tick={{ fill: '#6C7687', fontSize: 10.5 }} tickLine={false} axisLine={false} width={mobile ? 52 : 62} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" name={t('projects.analytics.totalSeries')} stroke="#1F3A5F" strokeWidth={3} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    {members.map((member, index) => (
                      <Line
                        key={member.userId}
                        type="monotone"
                        dataKey={`user_${member.userId}`}
                        name={member.userName}
                        stroke={MEMBER_COLORS[index % MEMBER_COLORS.length]}
                        strokeWidth={1.35}
                        strokeOpacity={0.55}
                        dot={false}
                        activeDot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Stack>
      ) : null}
    </Paper>
  );
}
