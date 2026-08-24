import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Skeleton, Tooltip, Typography, useMediaQuery } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import SegmentedCapsule from './SegmentedCapsule';
import ConnectedCategoryFlowChart from './ConnectedCategoryFlowChart';
import {
  getProjectCategoryLabel,
  getProjectCategoryTagStyles,
  PROJECT_CATEGORY_COLORS,
  PROJECT_CATEGORY_ORDER,
} from '../utils/projectCategories';
import { MINE_ANALYTICS_RANGES } from '../utils/mineTimeAnalytics';
import { useTranslation } from '../i18n/I18nProvider';

const cardSx = {
  minWidth: 0,
  height: '100%',
  border: '1px solid #E2E4E9',
  borderRadius: 3,
  bgcolor: '#FFFFFF',
  boxShadow: 'none',
  overflow: 'hidden',
  position: 'relative',
};

const formatHours = (value, locale = 'ru') => Number(value || 0).toLocaleString(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 });
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const QUARTER_LABELS = ['I', 'II', 'III', 'IV'];

export function buildCategoryChartData(timeSeries, { locale = 'ru', t = (key, params = {}) => ({ 'mineAnalytics.quarter': `${params.quarter} кв. ${params.year}`, ...Object.fromEntries(WEEKDAY_KEYS.map((key, index) => [`mineAnalytics.weekday.${key}`, ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][index]])) })[key] || key } = {}) {
  const bucket = timeSeries?.bucket || 'week';
  const dateLocale = locale === 'en' ? enUS : ru;
  return (timeSeries?.periods || []).map((period) => {
    const result = {
      startDate: period.startDate,
      endDate: period.endDate,
      totalHours: Number(period.totalHours || 0),
      isPartial: Boolean(period.isPartial),
      label: bucket === 'year'
        ? format(parseISO(period.startDate), 'yyyy')
        : bucket === 'quarter'
          ? t('mineAnalytics.quarter', { quarter: QUARTER_LABELS[Math.floor(parseISO(period.startDate).getMonth() / 3)], year: format(parseISO(period.startDate), 'yyyy') })
          : bucket === 'month'
          ? format(parseISO(period.startDate), 'LLL', { locale: dateLocale })
          : bucket === 'day'
            ? t(`mineAnalytics.weekday.${WEEKDAY_KEYS[parseISO(period.startDate).getDay()]}`)
            : format(parseISO(period.startDate), 'd MMM', { locale: dateLocale }),
      categoryDetails: {},
    };
    PROJECT_CATEGORY_ORDER.forEach((key) => {
      result[key] = 0;
    });
    (period.categories || []).forEach((category) => {
      result[category.key] = Number(category.percent || 0);
      result.categoryDetails[category.key] = category;
    });
    return result;
  });
}

export function buildDistributionItems(data, mode = 'projects', otherLabel = 'Остальные', selectedCategory = null) {
  const source = mode === 'clients'
    ? (data?.breakdowns?.clients || []).map((item) => ({ key: item.key, label: item.label, hours: Number(item.hours || 0) }))
    : (data?.projects || []).map((item) => ({
      key: item.project.id,
      label: [item.project.code, item.project.name].filter(Boolean).join(' — '),
      hours: Number(item.periodHours || 0),
      category: item.project.category || 'unclassified',
    })).filter((item) => !selectedCategory || item.category === selectedCategory);
  const sorted = source.filter((item) => item.hours > 0).sort((left, right) => right.hours - left.hours || left.label.localeCompare(right.label));
  const total = sorted.reduce((sum, item) => sum + item.hours, 0);
  const visible = sorted.slice(0, 5).map((item) => ({ ...item, percent: total > 0 ? (item.hours / total) * 100 : 0 }));
  const otherHours = sorted.slice(5).reduce((sum, item) => sum + item.hours, 0);
  if (otherHours > 0) visible.push({ key: 'other', label: otherLabel, hours: otherHours, percent: (otherHours / total) * 100 });
  const topThreeHours = sorted.slice(0, 3).reduce((sum, item) => sum + item.hours, 0);
  return {
    items: visible,
    total,
    count: sorted.length,
    topThreePercent: total > 0 ? Math.round((topThreeHours / total) * 100) : 0,
  };
}

function AnalyticsSkeleton() {
  return <Box sx={{ ...cardSx, p: 2 }}><Skeleton width="35%" /><Skeleton height={36} width="65%" /><Skeleton variant="rounded" height={120} /></Box>;
}

function LocalError({ onRetry, t }) {
  return <Alert severity="error" sx={{ ...cardSx, p: 1.5, gridColumn: 'span 2', '@container mine-layout (max-width: 767px)': { gridColumn: 'auto' } }} action={<Button size="small" onClick={onRetry}>{t('mineAnalytics.retry')}</Button>}>{t('mineAnalytics.error')}</Alert>;
}

export function TimeStructureTrendCard({
  data,
  range,
  onRangeChange,
  compact = false,
  bare = false,
  showRangeControl = true,
  selectedCategory,
  onCategoryChange,
}) {
  const { t, locale } = useTranslation();
  const [interaction, setInteraction] = useState(null);
  const chartData = useMemo(() => buildCategoryChartData(data?.timeSeries, { locale, t }), [data, locale, t]);
  const activeCategories = PROJECT_CATEGORY_ORDER.filter((key) => chartData.some((point) => Number(point[key] || 0) > 0));
  const hasData = chartData.some((point) => point.totalHours > 0);
  const categoryLabels = useMemo(
    () => Object.fromEntries(activeCategories.map((key) => [key, getProjectCategoryLabel(key, t)])),
    [activeCategories, t]
  );
  const handleInteractionChange = useCallback((value) => setInteraction(value), []);
  const interactionMetrics = useMemo(() => {
    if (!interaction) return null;
    if (interaction.type === 'ribbon') {
      return `${interaction.from.period.label} ${formatHours(interaction.from.hours, locale)} ${t('mineAnalytics.hoursSuffix')} · ${Math.round(interaction.from.percent)}% → ${interaction.to.period.label} ${formatHours(interaction.to.hours, locale)} ${t('mineAnalytics.hoursSuffix')} · ${Math.round(interaction.to.percent)}%`;
    }
    return `${interaction.period.label} · ${formatHours(interaction.hours, locale)} ${t('mineAnalytics.hoursSuffix')} · ${Math.round(interaction.percent)}%`;
  }, [interaction, locale, t]);
  const interactionLabel = interaction ? categoryLabels[interaction.category] || interaction.category : null;
  const tagStyle = interaction ? getProjectCategoryTagStyles(interaction.category) : null;
  return (
    <Box data-product-tour="home-time-structure" sx={{ ...cardSx, ...(bare ? { border: 0, borderRadius: 0, height: 'auto', flex: 1, overflow: 'hidden' } : { height: '100%', minHeight: 0 }), p: bare ? 0 : compact ? 1.25 : 1.5, minWidth: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: compact ? 0.75 : 1, mb: compact ? 0.5 : 0.25 }}>
        <Typography noWrap sx={{ minWidth: 0, fontSize: compact ? 11.5 : 12.5, fontWeight: 600, color: '#1D2433' }}>{t(compact ? 'mineAnalytics.compactTitle' : 'mineAnalytics.title')}</Typography>
        {showRangeControl && <Box data-product-tour="home-analytics-period"><SegmentedCapsule value={range} onChange={onRangeChange} options={MINE_ANALYTICS_RANGES.map((item) => ({ ...item, label: t(`mineAnalytics.ranges.${item.value}`) }))} ariaLabel={t('mineAnalytics.rangeAria')} idPrefix="mine-analytics-range" sx={{ width: compact ? 218 : 244, height: 30, p: '2px', flexShrink: 0, '& .MuiToggleButton-root': { height: 26, minWidth: compact ? 0 : 70, px: 0.75, fontSize: 10 } }} /></Box>}
      </Box>
      <Box
        data-category-details
        aria-live="polite"
        aria-atomic="true"
        sx={{
          width: '100%',
          height: compact ? 44 : 24,
          minHeight: compact ? 44 : 24,
          minWidth: 0,
          display: 'flex',
          flexDirection: compact && interaction ? 'column' : 'row',
          alignItems: compact && interaction ? 'flex-start' : 'center',
          justifyContent: interaction ? 'flex-start' : 'center',
          gap: compact && interaction ? 0.25 : 0.75,
          overflow: 'hidden',
        }}
      >
        {interaction ? <>
          <Box
            data-category-detail-tag={interaction.category}
            sx={{
              ...tagStyle,
              height: 20,
              maxWidth: compact ? '100%' : '45%',
              px: 1,
              flexShrink: 1,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              boxShadow: 'none',
            }}
          >
            <Typography noWrap sx={{ minWidth: 0, fontSize: 10.5, lineHeight: '16px', fontWeight: 600, color: 'inherit' }}>{interactionLabel}</Typography>
          </Box>
          <Typography data-category-detail-metrics noWrap sx={{ flexShrink: 0, fontSize: 10.5, lineHeight: '16px', color: '#667085' }}>{interactionMetrics}</Typography>
        </> : (
          <Typography noWrap sx={{ minWidth: 0, fontSize: 10.5, color: '#8A94A6' }}>{t('mineAnalytics.detailsEmpty')}</Typography>
        )}
      </Box>
      {hasData ? <>
        <Box sx={{ minWidth: 0, width: '100%', minHeight: compact ? 80 : 105, flex: 1, overflow: 'hidden' }}>
          <ConnectedCategoryFlowChart
            periods={chartData}
            categories={activeCategories}
            colors={PROJECT_CATEGORY_COLORS}
            labels={categoryLabels}
            compact={compact}
            onInteractionChange={handleInteractionChange}
            selectedCategory={selectedCategory}
            onSelectedCategoryChange={onCategoryChange}
            t={t}
            locale={locale}
          />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', mt: 0.25 }}>
          {activeCategories.map((key) => <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.45 }}><Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: PROJECT_CATEGORY_COLORS[key] }} /><Typography sx={{ fontSize: 9.5, color: '#667085' }}>{getProjectCategoryLabel(key, t)}</Typography></Box>)}
        </Box>
      </> : <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}><Typography sx={{ fontSize: 12, color: '#98A2B3' }}>{t('mineAnalytics.empty')}</Typography></Box>}
    </Box>
  );
}

function DistributionContent({ data, t, locale, selectedCategory }) {
  const distribution = useMemo(() => buildDistributionItems(data, 'projects', t('mineAnalytics.other'), selectedCategory), [data, selectedCategory, t]);
  if (!distribution.items.length) return <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}><Typography sx={{ fontSize: 12, color: '#98A2B3' }}>{t('mineAnalytics.empty')}</Typography></Box>;
  return <Box sx={{ minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pr: 1.25, scrollbarGutter: 'stable' }}>
    {distribution.items.map((item) => (
      <Box key={item.key} sx={{ mb: 0.7 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Tooltip title={item.label} placement="top" arrow><Typography noWrap sx={{ minWidth: 0, fontSize: 10.8, color: '#424957' }}>{item.label}</Typography></Tooltip>
          <Typography sx={{ flexShrink: 0, fontSize: 10.8, fontWeight: 600, color: '#1D2433' }}>{formatHours(item.hours, locale)} {t('mineAnalytics.hoursSuffix')} · {Math.round(item.percent)}%</Typography>
        </Box>
        <Box sx={{ mt: 0.3, height: 4, bgcolor: '#EEF1F8', borderRadius: 999, overflow: 'hidden' }}><Box sx={{ width: `${item.percent}%`, height: '100%', bgcolor: item.key === 'other' ? '#AEB8D9' : '#6D85DD', borderRadius: 999 }} /></Box>
      </Box>
    ))}
  </Box>;
}

function DistributionCard({ data, compact = false, bare = false, selectedCategory, onClearCategory }) {
  const { t, locale } = useTranslation();
  const distribution = useMemo(() => buildDistributionItems(data, 'projects', t('mineAnalytics.other'), selectedCategory), [data, selectedCategory, t]);
  return (
    <Box data-product-tour="home-project-distribution" className="mine-time-distribution" sx={{ ...cardSx, ...(bare ? { border: 0, borderRadius: 0, height: 'auto', flex: 1 } : {}), p: bare ? 0 : compact ? 1.25 : 1.5, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 0.8 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#1D2433' }}>{t('mineAnalytics.distributionTitle')}</Typography>
          <Typography sx={{ fontSize: 10.5, color: '#8A94A6' }}>{t('mineAnalytics.distributionSummary', { count: distribution.count, percent: distribution.topThreePercent })}</Typography>
        </Box>
      </Box>
      {selectedCategory && <Button
        data-selected-project-category={selectedCategory}
        size="small"
        onClick={onClearCategory}
        sx={{ alignSelf: 'flex-start', minWidth: 0, height: 22, mb: 0.75, px: 0.8, borderRadius: '6px', fontSize: 10.5, fontWeight: 400, lineHeight: 1.2, textTransform: 'none', whiteSpace: 'nowrap', ...getProjectCategoryTagStyles(selectedCategory), '&:hover': { filter: 'brightness(.97)' } }}
      >
        {getProjectCategoryLabel(selectedCategory, t)} ×
      </Button>}
      <DistributionContent data={data} t={t} locale={locale} selectedCategory={selectedCategory} />
    </Box>
  );
}

export default function MineTimeAnalytics({ data, loading, error, onRetry, range, onRangeChange }) {
  const { t } = useTranslation();
  const mobile = useMediaQuery('(max-width:767px)');
  const [mobileMode, setMobileMode] = useState('categories');
  const [selectedCategory, setSelectedCategory] = useState(null);
  useEffect(() => { setSelectedCategory(null); }, [data]);
  if (error && !data) return <Box sx={{ display: 'contents' }}><LocalError onRetry={onRetry} t={t} /></Box>;
  if (!data) return <Box sx={{ display: 'contents' }}><AnalyticsSkeleton /><AnalyticsSkeleton /></Box>;

  if (mobile) {
    return <Box sx={{ ...cardSx, p: 1.25, display: 'flex', flexDirection: 'column' }}>
      <SegmentedCapsule value={mobileMode} onChange={setMobileMode} options={[{ value: 'categories', label: t('mineAnalytics.categories') }, { value: 'projects', label: t('mineAnalytics.projects') }]} ariaLabel={t('mineAnalytics.mobileViewAria')} idPrefix="mine-mobile-analytics" sx={{ width: '100%', mb: 0.75 }} />
      {mobileMode === 'categories'
        ? <TimeStructureTrendCard data={data} range={range} onRangeChange={onRangeChange} compact bare selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
        : <DistributionCard data={data} compact bare selectedCategory={selectedCategory} onClearCategory={() => setSelectedCategory(null)} />}
      {loading && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', height: 2 }} />}
      {error && <Button size="small" onClick={onRetry} sx={{ position: 'absolute', right: 8, bottom: 4, fontSize: 10 }}>{t('mineAnalytics.retry')}</Button>}
    </Box>;
  }

  return <Box sx={{ display: 'contents' }}>
    <TimeStructureTrendCard data={data} range={range} onRangeChange={onRangeChange} selectedCategory={selectedCategory} onCategoryChange={setSelectedCategory} />
    <DistributionCard data={data} selectedCategory={selectedCategory} onClearCategory={() => setSelectedCategory(null)} />
    {loading && <LinearProgress sx={{ position: 'absolute', inset: '0 0 auto', height: 2 }} />}
    {error && <Button size="small" onClick={onRetry} sx={{ position: 'absolute', right: 8, bottom: 4, fontSize: 10 }}>{t('mineAnalytics.retryLoad')}</Button>}
  </Box>;
}
