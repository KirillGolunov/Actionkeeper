import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import TimerIcon from '@mui/icons-material/Timer';
import ListAltIcon from '@mui/icons-material/ListAlt';
import PeopleIcon from '@mui/icons-material/People';
import GroupIcon from '@mui/icons-material/Group';
import InsightsIcon from '@mui/icons-material/Insights';

export default function Navbar() {
  return (
    <AppBar position="static">
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
      </Toolbar>
    </AppBar>
  );
}