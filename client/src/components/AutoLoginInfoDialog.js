import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

function getDismissedKey(email) {
  return `autologin-info-dismissed:${email}`;
}

function getSessionSeenKey(email) {
  return `autologin-info-seen:${email}`;
}

export default function AutoLoginInfoDialog() {
  const { user, isAuthenticated, sessionStatus } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [dontShowAgain, setDontShowAgain] = React.useState(false);

  React.useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setOpen(false);
      setDontShowAgain(false);
      return;
    }

    const dismissed = localStorage.getItem(getDismissedKey(user.email)) === '1';
    const seenThisSession = sessionStorage.getItem(getSessionSeenKey(user.email)) === '1';

    if (!dismissed && !seenThisSession) {
      setOpen(true);
      sessionStorage.setItem(getSessionSeenKey(user.email), '1');
    }
  }, [isAuthenticated, user?.email]);

  const handleClose = () => {
    if (dontShowAgain && user?.email) {
      localStorage.setItem(getDismissedKey(user.email), '1');
    }
    setOpen(false);
  };

  const progress = sessionStatus?.progress;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>New autologin update</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          You can now keep your login for the next workweek without requesting a new magic link.
        </Typography>
        <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#F5F7FF', border: '1px solid #D8E0FF', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>How it works</Typography>
          <Typography sx={{ fontSize: 14, mb: 0.75 }}>
            Log 8 hours for each workday from Monday to Friday.
          </Typography>
          <Typography sx={{ fontSize: 14, mb: 0.75 }}>
            If all 5 workdays are complete, your login is automatically saved for next week.
          </Typography>
          <Typography sx={{ fontSize: 14 }}>
            You can track the progress anytime in the new autologin widget in the top navigation bar.
          </Typography>
        </Box>
        {progress && (
          <Box sx={{ p: 2, borderRadius: 2, backgroundColor: '#FAFAFA', border: '1px solid #E6E6E6' }}>
            <Typography sx={{ fontWeight: 700, mb: 1 }}>Your current progress</Typography>
            <Typography sx={{ fontSize: 14, mb: 1.25 }}>
              {progress.completedDays}/{progress.requiredDays} workdays completed this week.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {progress.days.map((day) => (
                <Box key={day.date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 34 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 10,
                      borderRadius: 999,
                      backgroundColor: day.complete ? '#9BE7B1' : day.isToday ? '#FFD36E' : '#D7DCE5',
                      outline: day.isToday ? '1px solid #5673DC' : 'none',
                      outlineOffset: 1,
                    }}
                  />
                  <Typography sx={{ fontSize: 11, mt: 0.5 }}>{day.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <FormControlLabel
          sx={{ mt: 2 }}
          control={<Checkbox checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />}
          label="Do not show this again"
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={handleClose}>Got it</Button>
      </DialogActions>
    </Dialog>
  );
}
