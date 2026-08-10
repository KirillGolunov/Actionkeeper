import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import Add from '@mui/icons-material/Add';
import Remove from '@mui/icons-material/Remove';

export default function HourInput({
  value,
  onChange,
  disabled,
  changed = false,
  invalid = false,
  decrementLabel = 'Уменьшить часы',
  incrementLabel = 'Увеличить часы',
}) {
  const numericValue = parseFloat(value) || 0;

  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(0, numericValue - 1);
    onChange(newValue === 0 ? '' : newValue);
  };

  const handleIncrement = () => {
    if (disabled) return;
    onChange(Math.min(24, numericValue + 1));
  };

  return (
    <Box
      data-changed={changed ? 'true' : 'false'}
      data-invalid={invalid ? 'true' : 'false'}
      sx={{
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${invalid ? '#E8A5A5' : changed ? '#AABAEB' : '#E2E4E9'}`,
        borderRadius: 2,
        px: 0.5,
        py: 0.2,
        minWidth: 48,
        justifyContent: 'center',
        background: invalid ? '#FFF7F7' : changed ? '#F7F8FD' : '#FFFFFF',
      }}
    >
      <IconButton
        aria-label={decrementLabel}
        size="small"
        onClick={handleDecrement}
        sx={{ p: 0.25 }}
        disabled={disabled || numericValue <= 0}
      >
        <Remove fontSize="small" />
      </IconButton>
      <Typography sx={{ mx: 0.5, minWidth: 16, textAlign: 'center', fontWeight: 500, fontSize: 14, color: disabled ? '#bdbdbd' : undefined }}>
        {value || 0}
      </Typography>
      <IconButton
        aria-label={incrementLabel}
        size="small"
        onClick={handleIncrement}
        sx={{ p: 0.25 }}
        disabled={disabled || numericValue >= 24}
      >
        <Add fontSize="small" />
      </IconButton>
    </Box>
  );
}
