import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PersonIcon from '@mui/icons-material/Person';
import useSession from '../../hooks/useSession';
import Button from '@mui/material/Button';
import { Link } from 'react-router';
import HistoryIcon from '@mui/icons-material/History';   
import LogOutButton from '../common/LogOutButton';

interface UserOptionsProps {
  readonly anchorEl: HTMLElement | null;
  readonly onClose: () => void;
}

export default function UserOptions({ anchorEl, onClose }: UserOptionsProps) {
  const { user } = useSession();   // ajusta a lo que devuelva tu hook

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Box sx={{ minWidth: 260, maxWidth: 340 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', p: 2 }}>
          <Avatar sx={{ width: 48, height: 48, bgcolor: 'transparent', color: 'text.primary' }}>
            <PersonIcon sx={{ fontSize: 44 }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {user?.firstName}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: 'text.secondary' }}>
              {user?.email}
            </Typography>
          </Box>
        </Stack>

        <Divider />

       <Stack spacing={0.5} sx={{ p: 1, minWidth: 180, alignItems: 'stretch' }}>
				
        <Button
          component={Link}
          to="/profile"
          startIcon={<PersonIcon />}
          onClick={onClose}
          sx={{ justifyContent: 'flex-start' }}
        >
          Mi perfil
        </Button>

        <Button
          component={Link}
          to="/settings"
          startIcon={<HistoryIcon />}
          onClick={onClose}
          sx={{ justifyContent: 'flex-start' }}
        >
          Historial de compras
        </Button>

        <LogOutButton sx={{ justifyContent: 'flex-start' }} />

      </Stack>
      </Box>
    </Popover>
  );
}