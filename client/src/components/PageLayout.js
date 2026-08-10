import React from 'react';
import { Box, Typography } from '@mui/material';

const pageBackground = 'linear-gradient(180deg, #F6F8FE 0%, #F9FBFF 100%)';
const panelBorder = '1px solid rgba(210, 220, 242, 0.85)';
const panelShadow = '0 10px 30px rgba(91, 117, 231, 0.06)';

export const pageActionButtonSx = {
  minHeight: 40,
  borderRadius: '12px',
  px: 2,
  backgroundColor: '#5B75E7',
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: 500,
  textTransform: 'none',
  boxShadow: '0 8px 18px rgba(91,117,231,0.16)',
  '&:hover': {
    backgroundColor: '#4A69D9',
    boxShadow: '0 10px 22px rgba(74,105,217,0.2)',
  },
};

export const pageFilterChipSx = {
  height: 32,
  borderRadius: '10px',
  px: 0.75,
  fontSize: 13,
  fontWeight: 500,
  boxShadow: 'none',
};

export function PageHeader({ title, subtitle, meta, headerCenter, actions, children, sx }) {
  const titleBlock = (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h4" sx={{ mb: 0.25, color: '#222832', letterSpacing: 0 }}>
        {title}
      </Typography>
      {(subtitle || meta) && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            color: '#7C89A3',
            fontSize: 14,
            lineHeight: 1.4,
          }}
        >
          {subtitle && (
            <Typography component="span" sx={{ color: 'inherit', fontSize: 'inherit', lineHeight: 'inherit' }}>
              {subtitle}
            </Typography>
          )}
          {meta}
        </Box>
      )}
      {children}
    </Box>
  );

  const actionsBlock = actions && (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: { xs: 'stretch', md: 'flex-end' },
        gap: 1,
        flexWrap: 'wrap',
        width: { xs: '100%', md: 'auto' },
        '& > *': {
          flexShrink: 0,
        },
      }}
    >
      {actions}
    </Box>
  );

  if (headerCenter) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto minmax(0, 1fr)' },
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 1.5,
          ...sx,
        }}
      >
        {titleBlock}
        <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'center' }, minWidth: 0 }}>
          {headerCenter}
        </Box>
        {actionsBlock || <Box sx={{ display: { xs: 'none', md: 'block' } }} />}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: { xs: 'column', md: 'row' },
        mb: 1.5,
        ...sx,
      }}
    >
      {titleBlock}
      {actionsBlock}
    </Box>
  );
}

export function PageToolbar({ start, center, end, children, sx }) {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.82)',
        border: panelBorder,
        borderRadius: '16px',
        px: { xs: 1.5, md: 2 },
        py: 1.5,
        boxShadow: panelShadow,
        backdropFilter: 'blur(10px)',
        ...sx,
      }}
    >
      {children || (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: center ? '1fr auto 1fr' : '1fr auto' },
            alignItems: 'center',
            gap: 1.25,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0 }}>
            {start}
          </Box>
          {center && (
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', lg: 'center' }, minWidth: 0 }}>
              {center}
            </Box>
          )}
          {end && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: { xs: 'flex-start', lg: 'flex-end' },
                gap: 1,
                flexWrap: 'wrap',
                minWidth: 0,
              }}
            >
              {end}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

export function PageSection({ children, sx }) {
  return (
    <Box sx={{ mb: 2.5, ...sx }}>
      {children}
    </Box>
  );
}

export default function PageLayout({
  title,
  subtitle,
  meta,
  headerCenter,
  actions,
  toolbar,
  children,
  headerChildren,
  sx,
  contentSx,
}) {
  return (
    <Box
      sx={{
        background: pageBackground,
        height: '100%',
        minHeight: 0,
        px: { xs: 2, md: 3 },
        pt: { xs: 2, md: 3 },
        pb: { xs: 2, md: 3 },
        overflowY: 'auto',
        overflowX: 'hidden',
        ...sx,
      }}
    >
      <PageSection>
        <PageHeader title={title} subtitle={subtitle} meta={meta} headerCenter={headerCenter} actions={actions}>
          {headerChildren}
        </PageHeader>
        {toolbar}
      </PageSection>
      <Box sx={contentSx}>{children}</Box>
    </Box>
  );
}
