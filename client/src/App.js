import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box } from '@mui/material';
import Navbar from './components/Navbar';
import Projects from './pages/Projects';
import TimeEntries from './pages/TimeEntries';
import Clients from './pages/Clients';
import Users from './pages/Users';
import DashboardsNew from './pages/Dashboards_new';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Navbar />
        <Box component="main" sx={{ mt: 4, mb: 4, flex: 1, width: '100%', px: 4 }}>
          <Routes>
            <Route path="/" element={<DashboardsNew />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/time-entries" element={<TimeEntries />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/users" element={<Users />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App; 