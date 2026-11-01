import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import useSession from '../../hooks/useSession';
import useNotifications from '../../hooks/useNotifications';
import type { Role } from '../../context/SessionContext';

const FORBIDDEN_MESSAGE = 'No tienes permisos para acceder a esta página';

function ForbiddenRedirect() {
  const notifications = useNotifications();

  useEffect(() => {
    // The key avoids a duplicated notification when the effect runs twice
    notifications.show(FORBIDDEN_MESSAGE, { key: 'forbidden-page', severity: 'error', autoHideDuration: 3000 });
  }, [notifications]);

  return <Navigate to="/" replace />;
}

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
    return <ForbiddenRedirect />;
  }

  return children;
}
