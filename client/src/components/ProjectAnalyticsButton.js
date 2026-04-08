import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import { useTranslation } from '../i18n/I18nProvider';

export default function ProjectAnalyticsButton({ onClick, size = 'small' }) {
  const { t } = useTranslation();

  return (
    <Tooltip title={t('projects.viewTimeEntries')} placement="top" arrow>
      <IconButton
        size={size}
        aria-label={t('projects.viewTimeEntries')}
        onClick={onClick}
        sx={{
          width: 34,
          height: 34,
          borderRadius: 2,
          border: '1.5px solid #D7DFF5',
          color: '#5673DC',
          backgroundColor: '#F6F8FF',
          '&:hover': {
            backgroundColor: '#EEF3FF',
            borderColor: '#C5D2FB',
          },
        }}
      >
        <QueryStatsRoundedIcon sx={{ fontSize: 19 }} />
      </IconButton>
    </Tooltip>
  );
}
