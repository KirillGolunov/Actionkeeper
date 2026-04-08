import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';

function SummaryCard({ label, value, secondary }) {
  return (
    <Card
      sx={{
        borderRadius: '12px',
        border: '1px solid #E2E4E9',
        boxShadow: 0,
        minHeight: 68,
      }}
    >
      <CardContent sx={{ p: 1.1, '&:last-child': { pb: 1.1 } }}>
        <Typography sx={{ color: '#7A8699', mb: 0.35, fontSize: 12.5, lineHeight: 1.15 }}>
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 700, color: '#1D2433', fontSize: 16.5, lineHeight: 1.1 }}>
          {value}
        </Typography>
        {secondary ? (
          <Typography sx={{ color: '#8A94A6', mt: 0.2, fontSize: 11.25, lineHeight: 1.15 }}>
            {secondary}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function ProjectAnalyticsSummary({ items }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 1.5,
      }}
    >
      {items.map((item) => (
        <Box key={item.label}>
          <SummaryCard {...item} />
        </Box>
      ))}
    </Box>
  );
}
