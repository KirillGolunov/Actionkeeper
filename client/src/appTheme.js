import { createTheme } from '@mui/material/styles';
import { modalScrollStabilityStyles } from './utils/modalScrollStability';

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: modalScrollStabilityStyles,
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          color: '#1D2433',
          backgroundColor: '#FFFFFF',
          border: '1px solid #DDE3EC',
          borderRadius: 8,
          boxShadow: '0 8px 20px rgba(31,58,95,.12)',
        },
        arrow: {
          color: '#FFFFFF',
          filter: 'drop-shadow(0 1px 1px rgba(31,58,95,.16))',
        },
      },
    },
  },
});
