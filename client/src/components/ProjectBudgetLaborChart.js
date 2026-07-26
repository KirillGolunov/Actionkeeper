import React from 'react';
import { Box, Chip, IconButton, Paper, Popover, Stack, Tooltip as MuiTooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from '../i18n/I18nProvider';
import {
  projectOverviewChartHeaderSx,
  projectOverviewChartSurfaceSx,
  projectOverviewChartViewportSx,
  projectOverviewEmptySx,
  projectOverviewTypography,
} from '../utils/projectOverviewLayout';

const COLORS = {
  actual: '#1F3A5F',
  warning: '#E77142',
  threshold: '#C9CFD9',
  payrollLimit: '#5673DC',
  danger: '#C43D36',
  total: '#697386',
  reserve: '#EAEEFA',
};

function LegendItem({ color, label, dashed = false, area = false }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.75}>
      <Box sx={area ? {
        width: 17, height: 9, borderRadius: 0.75, background: color, flexShrink: 0,
      } : {
        width: 18, height: 0, borderTop: `2px ${dashed ? 'dashed' : 'solid'} ${color}`, flexShrink: 0,
      }} />
      <Typography sx={{ color: '#5F6B7C', fontSize: 11.5 }}>{label}</Typography>
    </Stack>
  );
}

function ChartLegend({ contractMode, hasBudget }) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1.75} rowGap={0.75}>
      <LegendItem color={COLORS.actual} label={t('projects.budget.chart.legend.actual')} />
      {hasBudget ? <LegendItem color={COLORS.threshold} dashed label={t('projects.budget.chart.legend.warning')} /> : null}
      {hasBudget ? <LegendItem color={COLORS.payrollLimit} label={t('projects.budget.chart.legend.payrollLimit')} /> : null}
      {hasBudget && !contractMode ? <LegendItem color={COLORS.total} label={t('projects.budget.chart.legend.totalLimit')} /> : null}
      {hasBudget && contractMode ? <LegendItem color={COLORS.reserve} area label={t('projects.budget.chart.legend.reserve')} /> : null}
    </Stack>
  );
}

export default function ProjectBudgetLaborChart({ budget, summary, series = [] }) {
  const { t, locale } = useTranslation();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [legendAnchor, setLegendAnchor] = React.useState(null);
  const localeName = locale === 'ru' ? 'ru-RU' : 'en-US';
  const currency = React.useMemo(() => new Intl.NumberFormat(localeName, {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2,
  }), [localeName]);
  const compactCurrency = React.useMemo(() => new Intl.NumberFormat(localeName, {
    style: 'currency', currency: 'RUB', notation: 'compact', maximumFractionDigits: 1,
  }), [localeName]);
  const date = React.useMemo(() => new Intl.DateTimeFormat(localeName, {
    day: '2-digit', month: mobile ? '2-digit' : 'short', year: mobile ? undefined : 'numeric',
  }), [localeName, mobile]);
  const tooltipDate = React.useMemo(() => new Intl.DateTimeFormat(localeName, {
    day: 'numeric', month: 'long', year: 'numeric',
  }), [localeName]);

  const hasBudget = Boolean(budget);
  const payrollLimit = Number(budget?.payrollLimitRub || 0);
  const projectLimit = Number(budget?.projectBudgetLimitRub || 0);
  const contractAmount = budget?.budgetMode === 'contract' ? Number(budget.contractAmountExVatRub || 0) : null;
  const reserveAmount = contractAmount === null ? null : Math.max(0, contractAmount - projectLimit);
  const warningLevel = payrollLimit * Number(budget?.payrollWarningThresholdPercent || 0) / 100;
  const used = hasBudget ? Number(summary?.payrollUsedPercent || 0) : null;
  const currentTone = hasBudget && used >= 100 ? 'danger' : hasBudget && used >= Number(budget?.payrollWarningThresholdPercent || 0) ? 'warning' : 'normal';
  const toneColor = currentTone === 'danger' ? COLORS.danger : currentTone === 'warning' ? COLORS.warning : '#5673DC';

  const chartData = React.useMemo(() => {
    return series.map((point) => {
      const value = Number(point.cumulativeLaborCostRub || 0);
      const tone = hasBudget && value >= payrollLimit && (payrollLimit > 0 || value > 0)
        ? 'danger'
        : hasBudget && value >= warningLevel && (warningLevel > 0 || value > 0)
          ? 'warning'
          : 'normal';
      const result = { ...point, normalCost: null, warningCost: null, dangerCost: null };
      result[`${tone}Cost`] = value;
      return result;
    });
  }, [series, payrollLimit, warningLevel, hasBudget]);

  const actualMax = Math.max(0, ...series.map((point) => Number(point.cumulativeLaborCostRub || 0)));
  const controlMax = Math.max(payrollLimit, projectLimit, contractAmount || 0);
  const yMax = Math.max(actualMax, controlMax, 1) * 1.1;
  const isComplete = summary?.isComplete !== false;
  const singlePoint = chartData.length === 1;

  const lineData = React.useMemo(() => {
    const result = chartData.map((point) => ({ ...point }));
    for (let index = 1; index < result.length; index += 1) {
      const current = result[index];
      const previous = result[index - 1];
      const currentKey = ['dangerCost', 'warningCost', 'normalCost'].find((key) => current[key] !== null);
      const previousKey = ['dangerCost', 'warningCost', 'normalCost'].find((key) => previous[key] !== null);
      if (currentKey && previousKey && currentKey !== previousKey) previous[currentKey] = previous.cumulativeLaborCostRub;
    }
    return result;
  }, [chartData]);

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload;
    if (!point) return null;
    const percent = payrollLimit === 0
      ? (Number(point.cumulativeLaborCostRub || 0) > 0 ? 100 : 0)
      : Number(point.cumulativeLaborCostRub || 0) * 100 / payrollLimit;
    return (
      <Paper elevation={0} sx={{ p: 1.25, minWidth: 250, borderRadius: '12px', border: '1px solid #DDE3EC', boxShadow: '0 10px 28px rgba(31,58,95,.12)' }}>
        <Typography sx={{ color: '#6C7687', fontSize: 11.5, mb: 0.8 }}>{tooltipDate.format(new Date(`${point.date}T00:00:00`))}</Typography>
        <Stack spacing={0.55}>
          <TooltipRow label={t('projects.budget.chart.tooltip.daily')} value={currency.format(point.dailyLaborCostRub || 0)} />
          <TooltipRow label={t('projects.budget.chart.tooltip.cumulative')} value={currency.format(point.cumulativeLaborCostRub || 0)} strong />
          {hasBudget ? <TooltipRow label={t('projects.budget.chart.tooltip.used')} value={`${percent.toFixed(2)}%`} /> : null}
        </Stack>
        {hasBudget ? <Box sx={{ mt: 1, pt: 0.85, borderTop: '1px solid #E7EBF1' }}>
          <Typography sx={{ color: '#7A8699', fontSize: 10.5, fontWeight: 600, mb: 0.65 }}>
            {t('projects.budget.parametersTitle')}
          </Typography>
          <Stack spacing={0.55}>
            {contractAmount !== null ? (
              <TooltipRow label={t('projects.budget.overview.contract')} value={currency.format(contractAmount)} muted />
            ) : null}
            {reserveAmount !== null ? (
              <TooltipRow label={t('projects.budget.chart.legend.reserve')} value={currency.format(reserveAmount)} muted />
            ) : null}
            <TooltipRow label={t('projects.budget.totalLimit')} value={currency.format(projectLimit)} muted />
            <TooltipRow label={t('projects.budget.payrollLimit')} value={currency.format(payrollLimit)} muted />
          </Stack>
        </Box> : null}
      </Paper>
    );
  };

  const ariaLabel = hasBudget
    ? t('projects.budget.chart.ariaLabel', {
      value: currency.format(summary?.totalLaborCostRub || 0),
      percent: used.toFixed(2),
    })
    : t('projects.budget.chart.ariaLabelNoLimit', {
      value: currency.format(summary?.totalLaborCostRub || 0),
    });

  return (
    <Paper variant="outlined" sx={projectOverviewChartSurfaceSx}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={projectOverviewChartHeaderSx}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" useFlexGap flexWrap="wrap" spacing={1}>
            <Typography sx={projectOverviewTypography.chartTitle}>{t('projects.budget.chart.title')}</Typography>
            {!isComplete ? (
              <MuiTooltip title={t('projects.budget.chart.incompleteHint')} arrow>
                <Chip tabIndex={0} size="small" label={t('projects.budget.chart.incomplete')} sx={{ height: 23, background: '#FCF0EB', color: '#E77142', fontWeight: 700 }} />
              </MuiTooltip>
            ) : null}
            <MuiTooltip title={t('projects.budget.chart.legendButton')}>
              <IconButton
                size="small"
                aria-label={t('projects.budget.chart.legendButton')}
                aria-haspopup="dialog"
                aria-expanded={Boolean(legendAnchor)}
                onClick={(event) => setLegendAnchor(event.currentTarget)}
                sx={{ color: '#697386', p: 0.35 }}
              >
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </MuiTooltip>
          </Stack>
        </Box>
        {hasBudget ? <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
          <Typography sx={{ color: toneColor, fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{used.toFixed(2)}%</Typography>
          <Typography sx={{ color: '#7A8699', fontSize: 10.5, mt: 0.2 }}>{t('projects.budget.chart.usedLabel')}</Typography>
        </Box> : null}
      </Stack>

      <Popover
        open={Boolean(legendAnchor)}
        anchorEl={legendAnchor}
        onClose={() => setLegendAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{ sx: { p: 1.5, mt: 0.5, maxWidth: 360, borderRadius: 2, border: '1px solid #D6DEF0', boxShadow: '0 12px 28px rgba(90,112,184,0.16)' } }}
      >
        <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 1 }}>{t('projects.budget.chart.legendButton')}</Typography>
        <ChartLegend contractMode={budget?.budgetMode === 'contract'} hasBudget={hasBudget} />
      </Popover>

      {lineData.length === 0 ? (
        <Box sx={{ ...projectOverviewEmptySx, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', px: 2 }}>
          <Box>
            <Typography sx={{ fontWeight: 650, color: '#334155' }}>{t('projects.budget.chart.emptyTitle')}</Typography>
            <Typography sx={{ color: '#7A8699', fontSize: 12.5, mt: 0.4 }}>{t('projects.budget.chart.emptyHint')}</Typography>
          </Box>
        </Box>
      ) : (
        <Box
          role="img"
          tabIndex={0}
          aria-label={ariaLabel}
          sx={{ ...projectOverviewChartViewportSx, borderRadius: 1, '&:focus-visible': { outline: '3px solid rgba(86,115,220,.28)', outlineOffset: 2 } }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: mobile ? 5 : 16, left: mobile ? -12 : 5, bottom: 2 }}>
              <CartesianGrid stroke="#EEF1F6" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(value) => date.format(new Date(`${value}T00:00:00`))} tick={{ fill: '#6C7687', fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: '#D9DEE7' }} minTickGap={mobile ? 52 : 32} />
              <YAxis domain={[0, yMax]} tickFormatter={(value) => compactCurrency.format(value)} tick={{ fill: '#6C7687', fontSize: 10.5 }} tickLine={false} axisLine={false} width={mobile ? 58 : 76} />
              {hasBudget && contractAmount !== null && contractAmount > projectLimit ? <ReferenceArea y1={projectLimit} y2={contractAmount} fill={COLORS.reserve} fillOpacity={1} stroke="none" ifOverflow="extendDomain" /> : null}
              {hasBudget ? <ReferenceLine y={warningLevel} stroke={COLORS.threshold} strokeDasharray="6 5" strokeWidth={1.5} ifOverflow="extendDomain" /> : null}
              {hasBudget ? <ReferenceLine y={payrollLimit} stroke={COLORS.payrollLimit} strokeWidth={1.2} ifOverflow="extendDomain" /> : null}
              {hasBudget && contractAmount === null ? <ReferenceLine y={projectLimit} stroke={COLORS.total} strokeWidth={1.4} ifOverflow="extendDomain" /> : null}
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="normalCost" name={t('projects.budget.chart.legend.actual')} stroke={COLORS.actual} strokeWidth={3} dot={singlePoint ? { r: 3, fill: COLORS.actual } : false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="warningCost" name={t('projects.budget.chart.legend.actual')} stroke={COLORS.warning} strokeWidth={3} dot={singlePoint ? { r: 3, fill: COLORS.warning } : false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="dangerCost" name={t('projects.budget.chart.legend.actual')} stroke={COLORS.danger} strokeWidth={3} dot={singlePoint ? { r: 3, fill: COLORS.danger } : false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}

      {!isComplete ? (
        <MuiTooltip title={t('projects.budget.chart.missingRatesHint')} arrow>
          <Box tabIndex={0} sx={{ mt: 0.5, px: 1, py: 0.55, borderRadius: 1.5, background: '#FCF0EB', border: '1px solid rgba(231,113,66,.32)', '&:focus-visible': { outline: '3px solid rgba(231,113,66,.2)', outlineOffset: 1 } }}>
            <Typography sx={{ color: '#E77142', fontSize: 11.5 }}>{t('projects.budget.missingRates', { count: summary?.missingRateEntriesCount || 0 })}</Typography>
          </Box>
        </MuiTooltip>
      ) : null}
    </Paper>
  );
}

function TooltipRow({ label, value, strong = false, muted = false }) {
  const color = muted ? '#7A8699' : '#1D2433';
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography sx={{ color: muted ? color : '#5F6B7C', fontSize: 12 }}>{label}</Typography>
      <Typography sx={{ color, fontSize: 12, fontWeight: muted ? 500 : strong ? 750 : 600, whiteSpace: 'nowrap' }}>{value}</Typography>
    </Stack>
  );
}
