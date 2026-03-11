import React from 'react';
import CheckIcon from '@mui/icons-material/Check';
import { Box } from '@mui/material';

function getCelebrationKey(email, weekStart) {
  return `autologin-celebrated:${email}:${weekStart}`;
}

const BURST_COLORS = ['#FFF27A', '#FFD166', '#7EE787', '#79B8FF'];

export default function AutoLoginBadge({ qualified, weekStart, userEmail }) {
  const [celebrating, setCelebrating] = React.useState(false);
  const previousQualified = React.useRef(qualified);

  React.useEffect(() => {
    if (!userEmail || !weekStart) {
      previousQualified.current = qualified;
      return;
    }

    const celebrationKey = getCelebrationKey(userEmail, weekStart);
    const hasCelebrated = sessionStorage.getItem(celebrationKey) === '1';
    const justQualified = !previousQualified.current && qualified;

    if (justQualified && !hasCelebrated) {
      setCelebrating(true);
      sessionStorage.setItem(celebrationKey, '1');
      const timeoutId = window.setTimeout(() => setCelebrating(false), 4400);
      previousQualified.current = qualified;
      return () => window.clearTimeout(timeoutId);
    }

    if (!qualified) {
      setCelebrating(false);
      sessionStorage.removeItem(celebrationKey);
    }

    previousQualified.current = qualified;
    return undefined;
  }, [qualified, userEmail, weekStart]);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 42,
        height: 42,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        '@keyframes autologin-ring-burst': {
          '0%': { transform: 'scale(0.78)', opacity: 0 },
          '12%': { transform: 'scale(1)', opacity: 0.95 },
          '55%': { transform: 'scale(1.9)', opacity: 0.45 },
          '100%': { transform: 'scale(2.45)', opacity: 0 },
        },
        '@keyframes autologin-glow-pulse': {
          '0%': { opacity: 0, transform: 'scale(0.92)' },
          '18%': { opacity: 0.9, transform: 'scale(1.08)' },
          '100%': { opacity: 0, transform: 'scale(1.55)' },
        },
        '@keyframes autologin-spark': {
          '0%': { transform: 'translateY(-8px) scale(0.35)', opacity: 0 },
          '15%': { opacity: 1 },
          '68%': { opacity: 0.95 },
          '100%': { transform: 'translateY(-38px) scale(1.35)', opacity: 0 },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,242,122,0.55) 0%, rgba(126,231,135,0.22) 45%, rgba(121,184,255,0) 78%)',
          opacity: celebrating ? 1 : 0,
          animation: celebrating ? 'autologin-glow-pulse 3000ms ease-out forwards' : 'none',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: qualified ? '1px solid rgba(155,231,177,0.98)' : '1px solid rgba(255,255,255,0.55)',
          backgroundColor: qualified ? '#9BE7B1' : 'rgba(255,255,255,0.08)',
          boxShadow: qualified ? '0 0 24px rgba(255,242,122,0.38), 0 0 18px rgba(155,231,177,0.55)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: celebrating ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 260ms ease, background-color 220ms ease, box-shadow 220ms ease, border-color 220ms ease',
        }}
      >
        {qualified && <CheckIcon sx={{ fontSize: 22, color: '#14532D' }} />}
      </Box>

      <Box
        sx={{
          position: 'absolute',
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '2px solid rgba(255,242,122,0.8)',
          opacity: celebrating ? 1 : 0,
          animation: celebrating ? 'autologin-ring-burst 2800ms ease-out forwards' : 'none',
          pointerEvents: 'none',
          boxShadow: celebrating ? '0 0 18px rgba(255,242,122,0.65)' : 'none',
        }}
      />

      {Array.from({ length: 10 }).map((_, index) => {
        const angle = index * 36;
        const color = BURST_COLORS[index % BURST_COLORS.length];
        const delay = `${index * 85}ms`;
        return (
          <Box
            key={angle}
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              transform: `rotate(${angle}deg)`,
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: color,
                opacity: 0,
                transform: 'translateY(-8px) scale(0.35)',
                animation: celebrating ? 'autologin-spark 1800ms cubic-bezier(0.18, 0.78, 0.24, 1) forwards' : 'none',
                animationDelay: delay,
                boxShadow: `0 0 14px ${color}, 0 0 24px ${color}`,
              }}
            />
          </Box>
        );
      })}
    </Box>
  );
}
