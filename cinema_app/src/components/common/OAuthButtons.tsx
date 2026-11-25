import type { ReactNode } from 'react';
import Button, { type ButtonProps } from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import FacebookIcon from '@mui/icons-material/Facebook';
import GoogleIcon from '@mui/icons-material/Google';
import { API_BASE_URL } from '../../services/api';
import {
  OAUTH_PROVIDER_IDS,
  OAUTH_PROVIDERS,
  type OAuthProvider
} from '../../modules/auth/utils/oauthProviders';

const PROVIDER_ICONS: Record<OAuthProvider, ReactNode> = {
  google: <GoogleIcon />,
  facebook: <FacebookIcon />
};

const PROVIDER_BUTTON_PROPS: Record<OAuthProvider, ButtonProps> = {
  google: { variant: 'outlined' },
  facebook: {
    variant: 'contained',
    sx: { bgcolor: '#1877F2', '&:hover': { bgcolor: '#166FE5' } }
  }
};

export function OAuthButton({ provider }: Readonly<{ provider: OAuthProvider }>) {
  const handleClick = () => {
    window.location.assign(`${API_BASE_URL}/auth/${provider}`);
  };

  return (
    <Button fullWidth startIcon={PROVIDER_ICONS[provider]} onClick={handleClick} {...PROVIDER_BUTTON_PROPS[provider]}>
      Continuar con {OAUTH_PROVIDERS[provider].label}
    </Button>
  );
}

export default function OAuthButtons() {
  return (
    <>
      <Divider>o</Divider>
      {OAUTH_PROVIDER_IDS.map((provider) => (
        <OAuthButton key={provider} provider={provider} />
      ))}
    </>
  );
}