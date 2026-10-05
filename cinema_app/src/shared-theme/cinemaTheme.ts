import { createTheme } from '@mui/material/styles';
import { CONTRAST_TEXT, FONT_FAMILY, PALETTE } from './palette';

const cinemaTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: PALETTE.primary,
      dark: PALETTE.primaryDark,
      contrastText: CONTRAST_TEXT
    },
    secondary: {
      main: PALETTE.primaryDark,
      contrastText: CONTRAST_TEXT
    },
    info: {
      main: PALETTE.primary,
      contrastText: CONTRAST_TEXT
    },
    success: {
      main: PALETTE.success,
      contrastText: CONTRAST_TEXT
    },
    error: {
      main: PALETTE.error,
      contrastText: CONTRAST_TEXT
    },
    warning: {
      main: PALETTE.warning,
      contrastText: CONTRAST_TEXT
    },
    background: {
      default: PALETTE.background,
      paper: PALETTE.surface
    }
  },
  typography: {
    fontFamily: FONT_FAMILY,
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 8
  }
});

export default cinemaTheme;
