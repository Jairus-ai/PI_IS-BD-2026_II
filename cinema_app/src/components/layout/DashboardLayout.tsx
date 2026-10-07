import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router';
import DashboardHeader from './DashboardHeader';
import logo from '../../assets/logo.png';

export default function DashboardLayout() {
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        height: '100%',
        minHeight: '100dvh',
        width: '100%',
      }}
    >
      <DashboardHeader
        logo={<Box component="img" src={logo} alt="CinePI" sx={{ height: 40 }} />}
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
        }}
      >
        <Toolbar sx={{ displayPrint: 'none' }} />
        <Box
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
