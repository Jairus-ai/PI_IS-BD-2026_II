import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import GoogleIcon from '@mui/icons-material/Google';
import { API_BASE_URL } from '../../services/api';

const GOOGLE_AUTH_URL = `${API_BASE_URL}/auth/google`;

export default function GoogleAuthButton({ showDivider = true }: Readonly<{ showDivider?: boolean }>) {
  // Navegación completa: Google necesita redirigir el navegador, un fetch/XHR no sirve.
  const handleClick = () => {
    window.location.assign(GOOGLE_AUTH_URL);
  };

  return (
    <>
      {showDivider && <Divider>o</Divider>}
      <Button fullWidth variant="outlined" startIcon={<GoogleIcon />} onClick={handleClick}>
        Continuar con Google
      </Button>
    </>
  );
}