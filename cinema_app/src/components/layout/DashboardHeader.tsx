import type * as React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { Link } from 'react-router';
import LogOutButton from '../common/LogOutButton';
import LogInButton from '../common/LogInButton';
import SignUpButton from '../common/SignUpButton';
import useSession from '../../hooks/useSession'

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  borderWidth: 0,
  borderBottomWidth: 1,
  borderStyle: 'solid',
  borderColor: (theme.vars ?? theme).palette.divider,
  boxShadow: 'none',
  zIndex: theme.zIndex.drawer + 1,
}));

const LogoContainer = styled('div')({
  position: 'relative',
  height: 40,
  display: 'flex',
  alignItems: 'center',
  '& img': {
    maxHeight: 40,
  },
});

export interface DashboardHeaderProps {
  logo?: React.ReactNode;
  title?: string;
  menuOpen?: React.ReactNode;
  onToggleMenu?: React.ReactNode;
}

function HeaderMenu(){
  const { isLoggedIn } = useSession();

  if (isLoggedIn){
    return(
      <div id = "sessionButtons">
        <LogOutButton />
      </div>
    )
  }
  else{
    return(
      <div id = "sessionButtons">
      <LogInButton />
      <SignUpButton />    
      </div>
    )
  }
};

export default function DashboardHeader({
  logo,
  title,
  menuOpen,
  onToggleMenu,
}: Readonly<DashboardHeaderProps>) {
  const theme = useTheme();


  return (
    <AppBar color="inherit" position="absolute" sx={{ displayPrint: 'none' }}>
      <Toolbar sx={{ backgroundColor: 'inherit', mx: { xs: -0.75, sm: -1 } }}>
        <Stack
          direction="row"
          sx={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: '100%',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Stack direction="row" sx={{ alignItems: 'center' }}>
                {logo ? <LogoContainer>{logo}</LogoContainer> : null}
                {title ? (
                  <Typography
                    variant="h6"
                    sx={{
                      color: (theme.vars ?? theme).palette.primary.main,
                      fontWeight: '700',
                      ml: 1,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}
                  >
                    {title}
                  </Typography>
                ) : null}
              </Stack>
            </Link>
          </Stack>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', marginLeft: 'auto' }}
          >
          <HeaderMenu />
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
