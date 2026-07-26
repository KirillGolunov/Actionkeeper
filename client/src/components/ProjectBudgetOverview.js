import React from 'react';
import { Alert, Badge, Box, Button, Chip, CircularProgress, Paper, Stack, Tooltip, Typography } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from '../i18n/I18nProvider';
import { calculateBudgetDraft } from './ProjectBudgetSection';
import ProjectBudgetLaborChart from './ProjectBudgetLaborChart';
import { projectCardSurfaceSx } from '../utils/projectCardSurface';
import {
  projectOverviewContentSx,
  projectOverviewHeaderSx,
  projectOverviewKpiCardSx,
  projectOverviewTypography,
} from '../utils/projectOverviewLayout';

function SummaryCard({
  label,
  value,
  tone = 'default',
  muted = false,
  tooltip = '',
  changed = false,
  approvedValue = null,
}) {
  const { t } = useTranslation();
  const colors = tone === 'danger'
    ? { background: '#FFF2F1', color: '#C43D36', border: '#F2C9C6' }
    : tone === 'warning'
      ? { background: '#FCF0EB', color: '#E77142', border: '#F2C6B5' }
      : { background: muted ? '#F7F8FB' : '#FFFFFF', color: muted ? '#9AA3B2' : '#1D2433', border: '#E2E4E9' };
  return (
    <Paper
      variant="outlined"
      sx={{
        ...projectCardSurfaceSx,
        ...projectOverviewKpiCardSx,
        background: colors.background,
        borderColor: changed ? '#8EA6F3' : colors.border,
        boxShadow: changed ? '0 0 0 1px rgba(86,115,220,0.12)' : projectCardSurfaceSx.boxShadow,
        cursor: 'default',
      }}
    >
      <Tooltip
        title={(
          <Box>
            <Typography component="div" sx={{ fontSize: 12 }}>{tooltip || label}</Typography>
            {changed && approvedValue !== null ? (
              <Typography component="div" sx={{ fontSize: 12, mt: 0.35 }}>
                {t('projects.budget.overview.approvedValue', { value: approvedValue })}
              </Typography>
            ) : null}
          </Box>
        )}
        placement="top"
        arrow
      >
        <Typography sx={{ ...projectOverviewTypography.kpiLabel, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Typography>
      </Tooltip>
      <Typography title={value} sx={{ ...projectOverviewTypography.kpiValue, color: colors.color, mt: 0.35, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</Typography>
    </Paper>
  );
}

function EmptyChart({ message, hint = null, restricted = false }) {
  const { t } = useTranslation();
  return (
    <Paper
      variant="outlined"
      sx={{
        height: restricted ? '100%' : 'clamp(210px, 30vh, 250px)',
        minHeight: restricted ? 250 : undefined,
        p: 2,
        ...projectCardSurfaceSx,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #FAFBFE 100%)',
      }}
    >
      <Box sx={{ maxWidth: 390 }}>
        <Box sx={{ width: 46, height: 46, borderRadius: '14px', background: '#EEF3FF', color: '#5673DC', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
          {restricted ? <LockOutlinedIcon /> : <ShowChartOutlinedIcon />}
        </Box>
        <Typography sx={{ color: '#334155', fontWeight: 700 }}>{message}</Typography>
        <Typography sx={{ color: '#7A8699', fontSize: 12.5, mt: 0.5 }}>
          {hint || t('projects.budget.overview.previewHint')}
        </Typography>
      </Box>
    </Paper>
  );
}

export default function ProjectBudgetOverview({
  status,
  loading = false,
  error = null,
  previewDraft = null,
  previewKind = null,
  previewError = false,
  editing = false,
  settingsContent = null,
  onSettings,
  onCancel,
  onApply,
  cancelLabel,
  applyLabel,
  applyDisabled = false,
  applyVisible = true,
  isAdmin = false,
  isManager = false,
  restricted = false,
}) {
  const { t, locale } = useTranslation();
  const currency = React.useMemo(() => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 2,
  }), [locale]);
  if (restricted) {
    const restrictedCards = [
      t('projects.budget.totalLimit'),
      t('projects.budget.payrollLimit'),
      t('projects.budget.overview.accumulatedPayroll'),
      t('projects.budget.remaining'),
    ];
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
            {t('projects.budget.overview.title')}
          </Typography>
        </Box>
        <Stack spacing={1} sx={projectOverviewContentSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 0.75 }}>
            {restrictedCards.map((label) => (
              <SummaryCard key={label} label={label} value="—" muted />
            ))}
          </Box>
          <Box role="note" sx={{ flex: 1, minHeight: 0 }}>
            <EmptyChart
              restricted
              message={t('projects.budget.financialRestrictedTitle')}
              hint={t('projects.budget.financialRestrictedHint')}
            />
          </Box>
        </Stack>
      </Paper>
    );
  }
  const isPreview = previewDraft !== null;
  const previewActive = isPreview && previewDraft.budgetMode !== 'none';
  const preview = previewActive ? calculateBudgetDraft(previewDraft) : null;
  const budget = status?.budget || null;
  const budgetHasLimit = Boolean(budget && budget.budgetMode !== 'none');
  const summary = status?.summary || null;
  const used = Number(summary?.payrollUsedPercent || 0);
  const threshold = Number(budget?.payrollWarningThresholdPercent || 80);
  const exceeded = Number(summary?.payrollExceededRub || 0);
  const tone = used >= 100 ? 'danger' : used >= threshold ? 'warning' : 'default';
  const hasPendingRequest = Boolean(status?.activeRequest);
  const settingsLabel = hasPendingRequest
    ? isAdmin ? t('projects.budget.overview.showProposal') : isManager ? t('projects.budget.overview.showRequest') : t('projects.budget.overview.changeSettings')
    : budget ? t('projects.budget.overview.changeSettings') : t('projects.budget.overview.configure');

  const actualLaborCost = Number(summary?.totalLaborCostRub || 0);
  const previewExceeded = previewActive ? Math.max(0, actualLaborCost - preview.payroll) : 0;
  const previewRemaining = previewActive ? Math.max(0, preview.payroll - actualLaborCost) : 0;
  const previewUsed = previewActive
    ? (preview.payroll === 0 ? (actualLaborCost > 0 ? 100 : 0) : actualLaborCost * 100 / preview.payroll)
    : 0;
  const previewThreshold = Number(previewDraft?.payrollWarningThresholdPercent || 80);
  const previewTone = previewUsed >= 100 ? 'danger' : previewUsed >= previewThreshold ? 'warning' : 'default';
  const moneyChanged = (left, right) => Math.round(Number(left || 0) * 100) !== Math.round(Number(right || 0) * 100);
  const approvedContract = Number(budget?.contractAmountExVatRub || 0);
  const approvedTotal = Number(budget?.projectBudgetLimitRub || 0);
  const approvedPayroll = Number(budget?.payrollLimitRub || 0);
  const approvedBalance = exceeded > 0 ? exceeded : Number(summary?.payrollRemainingRub || 0);
  const canComparePreview = Boolean(isPreview && budgetHasLimit);

  const cards = isPreview ? previewActive ? [
    ...(previewDraft.budgetMode === 'contract' ? [{
      key: 'contract',
      label: t('projects.budget.overview.contract'),
      value: currency.format(Number(previewDraft.contractAmountExVatRub || 0)),
      changed: canComparePreview && (budget.budgetMode !== 'contract' || moneyChanged(previewDraft.contractAmountExVatRub, approvedContract)),
      approvedValue: currency.format(approvedContract),
    }] : []),
    {
      key: 'total',
      label: t('projects.budget.totalLimit'),
      value: currency.format(preview.total),
      changed: canComparePreview && moneyChanged(preview.total, approvedTotal),
      approvedValue: currency.format(approvedTotal),
    },
    {
      key: 'payroll',
      label: t('projects.budget.payrollLimit'),
      value: currency.format(preview.payroll),
      changed: canComparePreview && moneyChanged(preview.payroll, approvedPayroll),
      approvedValue: currency.format(approvedPayroll),
    },
    { key: 'actual', label: t('projects.budget.overview.accumulatedPayroll'), value: currency.format(actualLaborCost), tone: previewTone, tooltip: t('projects.budget.overview.accumulatedPayrollHint') },
    {
      key: 'balance',
      label: previewExceeded > 0 ? t('projects.budget.exceeded') : t('projects.budget.remaining'),
      value: currency.format(previewExceeded > 0 ? previewExceeded : previewRemaining),
      tone: previewTone,
      changed: canComparePreview && moneyChanged(previewExceeded > 0 ? previewExceeded : previewRemaining, approvedBalance),
      approvedValue: currency.format(approvedBalance),
    },
  ] : [
    { key: 'total', label: t('projects.budget.totalLimit'), value: '—', muted: true },
    { key: 'payroll', label: t('projects.budget.payrollLimit'), value: '—', muted: true },
    { key: 'actual', label: t('projects.budget.overview.accumulatedPayroll'), value: currency.format(actualLaborCost), tooltip: t('projects.budget.overview.accumulatedPayrollHint') },
    { key: 'balance', label: t('projects.budget.remaining'), value: '—', muted: true },
  ] : budgetHasLimit ? [
    ...(budget.budgetMode === 'contract' ? [{ key: 'contract', label: t('projects.budget.overview.contract'), value: currency.format(budget.contractAmountExVatRub || 0) }] : []),
    { key: 'total', label: t('projects.budget.totalLimit'), value: currency.format(budget.projectBudgetLimitRub || 0) },
    { key: 'payroll', label: t('projects.budget.payrollLimit'), value: currency.format(budget.payrollLimitRub || 0) },
    { key: 'actual', label: t('projects.budget.overview.accumulatedPayroll'), value: currency.format(summary?.totalLaborCostRub || 0), tone, tooltip: t('projects.budget.overview.accumulatedPayrollHint') },
    { key: 'balance', label: exceeded > 0 ? t('projects.budget.exceeded') : t('projects.budget.remaining'), value: currency.format(exceeded > 0 ? exceeded : summary?.payrollRemainingRub || 0), tone },
  ] : [
    { key: 'total', label: t('projects.budget.totalLimit'), value: '—', muted: true },
    { key: 'payroll', label: t('projects.budget.payrollLimit'), value: '—', muted: true },
    { key: 'actual', label: t('projects.budget.overview.accumulatedPayroll'), value: currency.format(actualLaborCost), tooltip: t('projects.budget.overview.accumulatedPayrollHint') },
    { key: 'balance', label: t('projects.budget.remaining'), value: '—', muted: true },
  ];

  return (
    <Paper variant="outlined" sx={{ ...projectCardSurfaceSx, p: { xs: 1.25, sm: 1.5 }, minWidth: 0, height: { lg: '100%' }, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={1}
        sx={projectOverviewHeaderSx}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" spacing={0.75}>
            <Typography component="h3" sx={projectOverviewTypography.sectionTitle}>{t('projects.budget.overview.title')}</Typography>
            {budget ? <Chip size="small" label={t('projects.budget.version', { version: budget.version })} sx={{ height: 23, background: '#EAF6F0', color: '#287A52', fontWeight: 700 }} /> : null}
            {status?.activeRequest ? (
              <Chip
                size="small"
                label={`${t('projects.budget.version', { version: status.activeRequest.proposedVersionNumber })} · ${t('projects.budget.statuses.pending')}`}
                sx={{ height: 23, background: '#FCF0EB', color: '#E77142', fontWeight: 700 }}
              />
            ) : null}
            {previewKind && isPreview ? <Chip size="small" label={t(`projects.budget.overview.${previewKind}`)} sx={{ height: 23, background: '#EEF3FF', color: '#4561C2', fontWeight: 700 }} /> : null}
            {previewError ? <Chip size="small" label={t('projects.budget.overview.hasErrors')} sx={{ height: 23, background: '#FCF0EB', color: '#E77142', fontWeight: 700 }} /> : null}
          </Stack>
        </Box>
        {editing ? (
          <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0 }}>
            <Button size="small" variant="outlined" onClick={onCancel} sx={{ textTransform: 'none', borderColor: '#D8DEEA', color: '#3D4655' }}>
              {cancelLabel}
            </Button>
            {applyVisible ? (
              <Button size="small" variant="contained" onClick={onApply} disabled={applyDisabled} sx={{ textTransform: 'none', backgroundColor: '#5673DC', '&:hover': { backgroundColor: '#4A69D9' } }}>
                {applyLabel}
              </Button>
            ) : null}
          </Stack>
        ) : (
          <Badge badgeContent={hasPendingRequest && isAdmin ? 1 : 0} invisible={!hasPendingRequest || !isAdmin} overlap="rectangular" sx={{ '& .MuiBadge-badge': { background: '#E77142', color: '#FFFFFF' } }}>
            <Button startIcon={<SettingsOutlinedIcon />} variant="outlined" size="small" onClick={onSettings} sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'auto' }, borderRadius: 2, borderColor: hasPendingRequest ? '#E77142' : '#CBD5EA', color: hasPendingRequest ? '#E77142' : '#4561C2', textTransform: 'none' }}>
              {isPreview && !previewActive ? t('projects.budget.overview.configure') : settingsLabel}
            </Button>
          </Badge>
        )}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      {loading && !status ? <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}><CircularProgress size={28} /></Box> : (
        <Stack spacing={1} sx={projectOverviewContentSx}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${cards.length}, minmax(0, 1fr))` }, gap: 0.75 }}>
            {cards.map((card) => <SummaryCard key={card.key || card.label} {...card} />)}
          </Box>
          {editing ? (
            <Paper
              variant="outlined"
              component="section"
              aria-label={t('projects.budget.parametersTitle')}
              sx={{
                p: { xs: 1, sm: 1.25 },
                borderRadius: '12px',
                borderColor: '#E2E4E9',
                boxShadow: 0,
                background: '#FFFFFF',
                flex: { lg: 1 },
                minHeight: { lg: 0 },
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  pr: { xs: 1, sm: 1.5 },
                  scrollbarGutter: 'stable',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#A7A7A7 transparent',
                  '&::-webkit-scrollbar': { width: 10 },
                  '&::-webkit-scrollbar-track': { background: 'transparent' },
                  '&::-webkit-scrollbar-thumb': {
                    background: '#A7A7A7',
                    borderRadius: 999,
                    border: '2px solid #FFFFFF',
                  },
                }}
              >
                {settingsContent}
              </Box>
            </Paper>
          ) : budget || (!isPreview && status) ? (
            <ProjectBudgetLaborChart budget={budgetHasLimit ? budget : null} summary={summary} series={status?.laborCostSeries || []} />
          ) : (
            <EmptyChart message={isPreview ? t('projects.budget.overview.previewTitle') : t('projects.budget.overview.noBudgetTitle')} />
          )}
        </Stack>
      )}
    </Paper>
  );
}
