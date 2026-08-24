import React, { useRef } from 'react';
import { Box, ToggleButton, Tooltip } from '@mui/material';

export default function SegmentedCapsule({ value, options, onChange, ariaLabel, idPrefix = 'home', sx, disabled = false }) {
  const refs = useRef({});

  const move = (event, index) => {
    if (disabled) return;
    const available = options.map((option, optionIndex) => ({ option, optionIndex })).filter(({ option }) => !option.disabled);
    if (!available.length || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const current = available.findIndex(({ optionIndex }) => optionIndex === index);
    let next = current;
    if (event.key === 'ArrowLeft') next = (current - 1 + available.length) % available.length;
    if (event.key === 'ArrowRight') next = (current + 1) % available.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = available.length - 1;
    event.preventDefault();
    const option = available[next].option;
    refs.current[option.value]?.focus();
    onChange(option.value);
  };

  return (
    <Box
      role="tablist"
      aria-label={ariaLabel}
      sx={{
        width: { xs: '100%', sm: Math.min(Math.max(options.length * 108, 196), 440) },
        maxWidth: '100%',
        height: 36,
        p: '3px',
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: 999,
        background: '#F1F2F4',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' },
        ...sx,
      }}
    >
      {options.map((option, index) => {
        const optionDisabled = disabled || Boolean(option.disabled);
        const button = (
          <ToggleButton
            key={option.value}
            ref={(node) => { refs.current[option.value] = node; }}
            value={option.value}
            selected={value === option.value}
            role="tab"
            id={`${idPrefix}-${option.value}-tab`}
            aria-selected={value === option.value}
            aria-controls={`${idPrefix}-${option.value}-panel`}
            data-product-tour={option.tour || undefined}
            tabIndex={value === option.value && !optionDisabled ? 0 : -1}
            disabled={optionDisabled}
            onClick={() => { if (!optionDisabled) onChange(option.value); }}
            onKeyDown={(event) => move(event, index)}
            sx={{
              flex: 1,
              minWidth: options.length > 3 ? 96 : 0,
              height: 30,
              px: 1.5,
              border: '0 !important',
              borderRadius: '999px !important',
              color: '#566071',
              fontSize: { xs: 11.5, sm: 12 },
              fontWeight: 500,
              lineHeight: 1,
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&.Mui-selected': {
                color: '#1D2433',
                background: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(31,42,68,.12)',
                fontWeight: 700,
              },
              '&.Mui-selected:hover': { background: '#FFFFFF' },
              '&:hover': { background: 'rgba(255,255,255,.55)' },
              '&.Mui-disabled': { cursor: 'not-allowed', pointerEvents: 'none' },
              '&.Mui-focusVisible': { outline: '3px solid rgba(86,115,220,.20)', outlineOffset: 1 },
            }}
          >
            {option.label}
          </ToggleButton>
        );
        return option.tooltip ? <Tooltip key={option.value} title={option.tooltip} arrow><span data-option-tooltip={option.value} style={{ display: 'flex', flex: 1, cursor: optionDisabled ? 'not-allowed' : undefined }}>{button}</span></Tooltip> : button;
      })}
    </Box>
  );
}
