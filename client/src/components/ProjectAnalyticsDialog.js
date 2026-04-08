import React from 'react';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ProjectAnalyticsView from './ProjectAnalyticsView';

export default function ProjectAnalyticsDialog({ open, project, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: '14px',
          overflow: 'hidden',
          height: { xs: 'calc(100dvh - 24px)', md: 'min(860px, calc(100dvh - 48px))' },
          maxHeight: { xs: 'calc(100dvh - 24px)', md: 'calc(100dvh - 48px)' },
        },
      }}
    >
      <DialogTitle sx={{ py: 0.5, minHeight: 0 }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 10,
            top: 10,
            color: '#7D8797',
            zIndex: 2,
            backgroundColor: 'rgba(255,255,255,0.9)',
            '&:hover': {
              backgroundColor: '#F5F7FA',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          px: 2,
          pb: 2,
          pt: 0,
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <ProjectAnalyticsView open={open} project={project} />
      </DialogContent>
    </Dialog>
  );
}
