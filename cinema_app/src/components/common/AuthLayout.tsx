import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import MuiCard from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';

import logo from '../../assets/logo.png';

const Card = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'cardWidth'
})<{ cardWidth: number }>(({ theme, cardWidth }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05), 0px 15px 35px -5px rgba(0, 0, 0, 0.05)',
  [theme.breakpoints.up('sm')]: {
    width: `${cardWidth}px`
  }
}));

const AuthContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100dvh',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4)
  }
}));

type AuthLayoutProps = {
  title: string;
  cardWidth?: number;
  children: ReactNode;
};

export default function AuthLayout({ title, cardWidth = 450, children }: Readonly<AuthLayoutProps>) {
  return (
    <AuthContainer direction="column" sx={{ justifyContent: 'center' }}>
      <Card variant="outlined" cardWidth={cardWidth}>
        <Box component="img" src={logo} alt="CinePI" sx={{ height: 48, alignSelf: 'flex-start' }} />
        <Typography component="h1" variant="h4" sx={{ fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
          {title}
        </Typography>
        {children}
      </Card>
    </AuthContainer>
  );
}
