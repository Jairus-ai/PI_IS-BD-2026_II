
import { useNavigate } from 'react-router';
import Button, { type ButtonProps } from '@mui/material/Button';



export default function SignUpButton(buttonProps: Readonly<Omit<ButtonProps, 'onClick'>>) {
  const navigate = useNavigate();

  const handleClick = () => {
    void navigate('/register');
  };

  return (
    <Button
      onClick={handleClick}
      {...buttonProps}
    >
      Registrarse
    </Button>
  );
}
