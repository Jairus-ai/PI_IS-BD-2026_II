import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import { Outlet } from 'react-router';
import DashboardHeader from './DashboardHeader';
import logo from '../../assets/logo.png';

// Layout for client pages: same header as the dashboard, without the workers sidebar
export default function ClientLayout() {
  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '100dvh', width: '100%' }}>
      <DashboardHeader logo={<Box component="img" src={logo} alt="CinePI" sx={{ height: 40 }} />} title="" />
      <Toolbar sx={{ displayPrint: 'none' }} />
      <Box component="main" sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
