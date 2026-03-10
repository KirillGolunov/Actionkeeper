import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Tooltip } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import TimerIcon from '@mui/icons-material/Timer';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import InsightsIcon from '@mui/icons-material/Insights';
import { useAuth } from '../context/AuthContext';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

export default function Navbar() {
  const { user, logout, sessionStatus } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/signin');
  };

  // User menu state
  const [anchorEl, setAnchorEl] = React.useState(null);
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Avatar logic
  const avatarUrl = user?.avatar_url || '';
  const initials = user ? ((user.name?.[0] || '') + (user.surname?.[0] || '')).toUpperCase() : '';
  const progress = sessionStatus?.progress;

  return (
    <AppBar position="static" sx={{ backgroundColor: '#5673DC' }}>
      <Toolbar>
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 1.5, flexShrink: 0 }}>
          <TimerIcon sx={{ mr: 1.25 }} />
          <Typography variant="h6" component="div" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
            Time Tracker
          </Typography>
        </Box>
        {user && progress && (
          <Tooltip title={sessionStatus?.message || ''} arrow>
            <Box sx={{ ml: 2, px: 1.5, py: 0.75, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)', minWidth: 220 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, lineHeight: 1.1 }}>Autologin</Typography>
              <Typography sx={{ fontSize: 12, opacity: 0.95, mt: 0.35 }}>
                {progress.completedDays}/{progress.requiredDays} days completed
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
                {progress.days.map((day) => (
                  <Box key={day.date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                    <Box
                      sx={{
                        width: 20,
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: day.complete ? '#9BE7B1' : day.isToday ? '#FFD36E' : 'rgba(255,255,255,0.38)',
                        outline: day.isToday ? '1px solid rgba(255,255,255,0.9)' : 'none',
                        outlineOffset: 1,
                      }}
                    />
                    <Typography sx={{ fontSize: 10, mt: 0.35, opacity: 0.95 }}>{day.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end', ml: 2 }}>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            startIcon={<InsightsIcon />}
          >
            Dashboard
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/projects"
            startIcon={<ListAltIcon />}
          >
            Projects
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/clients"
            startIcon={<PeopleIcon />}
          >
            Clients
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/users"
            startIcon={<GroupIcon />}
          >
            Users
          </Button>
          <Button
            color="inherit"
            component={RouterLink}
            to="/time-entries"
            startIcon={<TimerIcon />}
          >
            Time Entries
          </Button>
        </Box>
        {user && (
          <Box sx={{ ml: 2 }}>
            <IconButton onClick={handleMenuOpen} size="small" sx={{ ml: 2 }}>
              <Avatar src={avatarUrl} sx={{ width: 44, height: 44, bgcolor: '#5673DC', fontWeight: 600, fontSize: 22 }}>
                {!avatarUrl && initials}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                sx: {
                  borderRadius: 2,
                  minWidth: 190,
                  boxShadow: 2,
                  p: 0,
                  mt: 1,
                }
              }}
            >
              <Box sx={{ px: 1.2, pt: 1, pb: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid #eee' }}>
                <Avatar src={avatarUrl} sx={{ width: 32, height: 32, bgcolor: '#5673DC', fontWeight: 600, fontSize: 15 }}>
                  {!avatarUrl && initials}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{user.name} {user.surname}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: 11 }}>{user.email}</Typography>
                </Box>
              </Box>
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                Profile
              </MenuItem>
              {isAdmin && (
                <MenuItem onClick={() => { handleMenuClose(); navigate('/settings/smtp'); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                  Settings
                </MenuItem>
              )}
              <MenuItem onClick={() => { handleMenuClose(); handleLogout(); }} sx={{ fontSize: 14, py: 1, px: 1.5 }}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
