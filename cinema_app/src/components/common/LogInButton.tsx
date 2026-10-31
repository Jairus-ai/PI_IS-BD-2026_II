import { useRef } from 'react';
import { useNavigate } from 'react-router';
import Button, { type ButtonProps } from '@mui/material/Button';
import { useLogIn } from '../../modules/auth/hooks/useLogIn';
import LoginIcon from '@mui/icons-material/Login';

export default function LogInButton(buttonProps: Readonly<Omit<ButtonProps, 'onClick'>>) {
  const navigate = useNavigate();
  const { logIn, isLoggingIn } = useLogIn();
  const isRequestSent = useRef(false);

  const finishLogIn = () => {
    void navigate('/login');
  };

  const handleClick = () => {
    if (isRequestSent.current) {
      return;
    }
    isRequestSent.current = true;
    logIn(undefined, { onSettled: finishLogIn });
  };

  return (
    <Button
      startIcon = {<LoginIcon/>}
      disabled={isLoggingIn}
      onClick={handleClick}
      {...buttonProps}
    >
      Iniciar Sesion
    </Button>
  );
}
