import React from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, IconButton,
  Stack, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const statusChipSx = {
  height: 24,
  borderRadius: '999px',
  fontSize: 12,
  fontWeight: 600,
};

export default function ProjectDialogLayout({
  open,
  onClose,
  title,
  subtitle,
  chips = [],
  headerAction,
  children,
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary,
  primaryDisabled = false,
  primaryVisible = true,
  actionsVisible = true,
  closeDisabled = false,
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={closeDisabled ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={false}
      scroll="paper"
      PaperProps={{
        sx: {
          width: { sm: 'calc(100% - 48px)' },
          maxWidth: 1320,
          height: { xs: '100dvh', sm: 'min(900px, calc(100dvh - 48px))' },
          maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 48px)' },
          borderRadius: { xs: 0, sm: '14px' },
          overflow: 'hidden',
          background: '#FBFCFF',
        },
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 3 },
          py: { xs: 1.25, sm: 1.75 },
          background: 'rgba(255,255,255,0.96)',
          borderBottom: '1px solid #E2E4E9',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: { xs: 1, sm: 2 }, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{ color: '#1D2433', fontSize: { xs: 20, sm: 24 }, fontWeight: 700, lineHeight: 1.2 }}
            >
              {title}
            </Typography>
            {subtitle ? (
              <Typography sx={{ color: '#7A8699', fontSize: 13, mt: 0.5 }}>
                {subtitle}
              </Typography>
            ) : null}
            {chips.length > 0 ? (
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.75} sx={{ mt: 1.25 }}>
                {chips.map((chip) => (
                  <Chip
                    key={chip.key || chip.label}
                    size="small"
                    icon={chip.icon || undefined}
                    label={chip.label}
                    sx={{ ...statusChipSx, ...chip.sx }}
                  />
                ))}
              </Stack>
            ) : null}
          </Box>
          {headerAction ? (
            <Box sx={{ order: { xs: 3, sm: 2 }, width: { xs: '100%', sm: 'auto' }, display: 'flex', justifyContent: 'flex-end' }}>
              {headerAction}
            </Box>
          ) : null}
          <IconButton
            aria-label={secondaryLabel}
            onClick={onClose}
            disabled={closeDisabled}
            sx={{ order: { xs: 2, sm: 3 }, color: '#7D8797', background: '#F5F7FA', '&:hover': { background: '#E9EDF5' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      <DialogContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          overflowX: 'hidden',
          overflowY: 'auto',
          background: '#FBFCFF',
        }}
      >
        {children}
      </DialogContent>

      {actionsVisible ? <DialogActions
        sx={{
          flexShrink: 0,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          gap: 1,
          background: 'rgba(255,255,255,0.98)',
          borderTop: '1px solid #E2E4E9',
        }}
      >
        <Button
          onClick={onSecondary}
          variant="outlined"
          sx={{ borderRadius: 2, borderColor: '#D8DEEA', color: '#3D4655', textTransform: 'none' }}
        >
          {secondaryLabel}
        </Button>
        {primaryVisible ? (
          <Button
            onClick={onPrimary}
            disabled={primaryDisabled}
            variant="contained"
            sx={{
              borderRadius: 2,
              px: 2.25,
              backgroundColor: '#5673DC',
              boxShadow: '0 6px 16px rgba(86,115,220,0.24)',
              textTransform: 'none',
              '&:hover': { backgroundColor: '#4A69D9' },
            }}
          >
            {primaryLabel}
          </Button>
        ) : null}
      </DialogActions> : null}
    </Dialog>
  );
}
