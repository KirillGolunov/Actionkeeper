import React, { useMemo } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { useTranslation } from '../i18n/I18nProvider';

const formatCurrency = (value, locale) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
const formatHours = (value, locale) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ru-RU', { maximumFractionDigits: 1 }).format(value);

export function normalizeContractComparisonProjects(projects, locale = 'ru') {
  return (Array.isArray(projects) ? projects : [])
    .filter((project) => Number.isFinite(Number(project?.projectId)) && Number(project?.contractAmountExVatRub) > 0)
    .map((project) => ({
      projectId: Number(project.projectId),
      name: project.name || '',
      code: project.code || '',
      contractAmountExVatRub: Number(project.contractAmountExVatRub),
      lifetimeHours: Number(project.lifetimeHours || 0),
    }))
    .sort((left, right) => right.contractAmountExVatRub - left.contractAmountExVatRub || left.name.localeCompare(right.name, locale === 'en' ? 'en' : 'ru'));
}

export default function ContractEffortTornadoChart({ projects, onProjectOpen }) {
  const { t, locale } = useTranslation();
  const rows = useMemo(() => normalizeContractComparisonProjects(projects, locale), [projects, locale]);
  const maxContract = Math.max(1, ...rows.map((project) => project.contractAmountExVatRub));
  const maxHours = Math.max(1, ...rows.map((project) => project.lifetimeHours));

  return <Box data-product-tour="tornado" sx={{ height: '100%', minHeight: 0, p: 1.5, display: 'flex', flexDirection: 'column', border: '1px solid #E2E4E9', borderRadius: 3, bgcolor: '#FFF', overflow: 'hidden' }}>
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
      <Typography noWrap sx={{ minWidth: 0, fontSize: 12.5, fontWeight: 600, color: '#1D2433' }}>{t('analytics.tornado.title')}</Typography>
      <Typography noWrap sx={{ flexShrink: 0, fontSize: 9.5, color: '#8A94A6' }}>{t('analytics.tornado.lifetime')}</Typography>
    </Box>
    {!rows.length ? <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', px: 2 }}><Typography sx={{ fontSize: 11.5, color: '#98A2B3' }}>{t('analytics.tornado.empty')}</Typography></Box> : <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(76px, 108px) minmax(0, 1fr) 1px minmax(0, 1fr)', alignItems: 'center', columnGap: 0.75, px: 0.25, pb: 0.4 }}>
        <Typography noWrap sx={{ fontSize: 9.5, color: '#8A94A6' }}>{t('analytics.tornado.code')}</Typography>
        <Typography noWrap sx={{ textAlign: 'right', fontSize: 9.5, color: '#8A94A6' }}>{t('analytics.tornado.contractRub')}</Typography>
        <Box />
        <Typography noWrap sx={{ fontSize: 9.5, color: '#8A94A6' }}>{t('analytics.tornado.effortHours')}</Typography>
      </Box>
      <Box sx={{ minHeight: 0, flex: 1, overflowY: 'auto', overflowX: 'hidden', pr: 0.5, scrollbarGutter: 'stable' }}>
        {rows.map((project) => {
          const contractWidth = `${Math.max(2, project.contractAmountExVatRub / maxContract * 100)}%`;
          const hoursWidth = `${Math.max(2, project.lifetimeHours / maxHours * 100)}%`;
          const label = [project.code, project.name].filter(Boolean).join(' — ') || t('analytics.tornado.fallbackProject', { id: project.projectId });
          const tooltip = <Box sx={{ minWidth: 210 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, mb: 0.8 }}>{label}</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: 1.5, rowGap: 0.35, fontSize: 11.5 }}>
              <Typography component="span" sx={{ fontSize: 'inherit', color: '#667085' }}>{t('analytics.tornado.contract')}</Typography>
              <Typography component="span" sx={{ fontSize: 'inherit', color: '#667085' }}>{t('analytics.tornado.effort')}</Typography>
              <Typography component="span" sx={{ fontSize: 'inherit', color: '#1D2433', whiteSpace: 'nowrap' }}>{formatCurrency(project.contractAmountExVatRub, locale)}</Typography>
              <Typography component="span" sx={{ fontSize: 'inherit', color: '#1D2433', whiteSpace: 'nowrap' }}>{formatHours(project.lifetimeHours, locale)} {t('mineAnalytics.hoursSuffix')}</Typography>
            </Box>
          </Box>;
          const ariaLabel = t('analytics.tornado.aria', { project: label, contract: formatCurrency(project.contractAmountExVatRub, locale), hours: formatHours(project.lifetimeHours, locale) });
          const open = () => onProjectOpen?.(project.projectId);
          return <Tooltip key={project.projectId} title={tooltip} arrow placement="top">
            <Box
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              data-contract-tornado-row={project.projectId}
              data-product-tour="tornado-row"
              onClick={open}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open();
                }
              }}
              sx={{ display: 'grid', gridTemplateColumns: 'minmax(76px, 108px) minmax(0, 1fr) 1px minmax(0, 1fr)', alignItems: 'center', columnGap: 0.75, height: 28, px: 0.25, borderRadius: 1, cursor: 'pointer', outline: 0, '&:hover': { bgcolor: '#F7F8FA' }, '&:focus-visible': { outline: '2px solid #4A68D9', outlineOffset: -1, bgcolor: '#F7F8FA' } }}
            >
              <Typography noWrap sx={{ minWidth: 0, fontSize: 10.2, color: '#475467', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.code || '—'}</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', minWidth: 0 }}><Box sx={{ width: contractWidth, maxWidth: '100%', height: 10, borderRadius: '4px 0 0 4px', bgcolor: '#B892E8' }} /></Box>
              <Box sx={{ alignSelf: 'stretch', bgcolor: '#E2E4E9' }} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', minWidth: 0 }}><Box sx={{ width: hoursWidth, maxWidth: '100%', height: 10, borderRadius: '0 4px 4px 0', bgcolor: '#8296E0' }} /></Box>
            </Box>
          </Tooltip>;
        })}
      </Box>
    </>}
  </Box>;
}
