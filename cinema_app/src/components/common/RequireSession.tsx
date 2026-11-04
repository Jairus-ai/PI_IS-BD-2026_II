import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import useSession from '../../hooks/useSession';
import type { Role } from '../../context/SessionContext';

type RequireSessionProps = {
  allowedRoles?: Role[];
  children: ReactNode;
};

export default function RequireSession({ allowedRoles, children }: Readonly<RequireSessionProps>) {
  const { user, isCheckingSession } = useSession();
  const location = useLocation();

  if (isCheckingSession) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100dvh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
