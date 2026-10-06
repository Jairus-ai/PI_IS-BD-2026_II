import { useRef } from 'react';
import { useNavigate } from 'react-router';
import Button, { type ButtonProps } from '@mui/material/Button';
import LogoutIcon from '@mui/icons-material/Logout';
import useNotifications from '../../hooks/useNotifications';
import useSession from '../../hooks/useSession';
import { useLogOut } from '../../modules/auth/hooks/useLogOut';

const LOG_OUT_MESSAGE = 'Sesión cerrada correctamente';
const NOTIFICATION_DURATION_MS = 4000;

export default function LogOutButton(buttonProps: Omit<ButtonProps, 'onClick'>) {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { endSession } = useSession();
  const { logOut, isLoggingOut } = useLogOut();
  const isRequestSent = useRef(false);

  const finishLogOut = () => {
    endSession();
    notifications.show(LOG_OUT_MESSAGE, {
      severity: 'success',
      autoHideDuration: NOTIFICATION_DURATION_MS
    });
    navigate('/login', { replace: true });
  };

  const handleClick = () => {
    if (isRequestSent.current) {
      return;
    }
    isRequestSent.current = true;
    logOut(undefined, { onSettled: finishLogOut });
  };

  return (
    <Button
      startIcon={<LogoutIcon />}
      disabled={isLoggingOut}
      onClick={handleClick}
      {...buttonProps}
    >
      Cerrar sesión
    </Button>
  );
}
