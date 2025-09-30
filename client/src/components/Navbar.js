import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import TimerIcon from '@mui/icons-material/Timer';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import InsightsIcon from '@mui/icons-material/Insights';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';

export default function Navbar() {
  const { user, logout } = useAuth();
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

  return (
    <AppBar position="static" sx={{ backgroundColor: '#5673DC' }}>
      <Toolbar>
        <TimerIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Time Tracker
        </Typography>
        <Box>
          <Button
            color="inherit"
            component={RouterLink}
            to="/"
            startIcon={<InsightsIcon />}
          >
            Dashboard
          </Button>
          {isAdmin && (
            <>
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
            </>
          )}
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
              {user.role === 'admin' && (
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