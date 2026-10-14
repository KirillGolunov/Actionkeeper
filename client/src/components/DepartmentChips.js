import React from 'react';
import { Box, Chip, Tooltip } from '@mui/material';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { getDepartmentChipSx } from '../utils/departmentColors';
import { useTranslation } from '../i18n/I18nProvider';
export default function DepartmentChips({ departments = [], sx = {}, responsibleId }) {
  const { t } = useTranslation();
  return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, my: 0.5, flexShrink: 0, minWidth: 0, ...sx }}>
    {departments.map(d => <Tooltip key={d.id} enterDelay={500} title={`${d.is_system ? t('departments.unassigned') : d.name}${d.id === responsibleId ? ` · ${t('governance.owner')}` : ''}`}>
      <Chip icon={d.id === responsibleId ? <FlagOutlinedIcon sx={{ fontSize: 15, color: 'inherit !important' }} /> : undefined} size="small" label={d.is_system ? t('departments.unassigned') : (d.short_name || d.name)} sx={{ ...getDepartmentChipSx(d), maxWidth: '100%', height: 24, flexShrink: 0, '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }} />
    </Tooltip>)}
  </Box>;
}
