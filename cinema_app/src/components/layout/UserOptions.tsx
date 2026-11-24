import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useSession from '../../hooks/useSession';
import Button from '@mui/material/Button';
import LogOutButton from '../common/LogOutButton';
import type { ReactNode } from 'react';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import HistoryIcon from '@mui/icons-material/History';
import { Link } from 'react-router';
import { ROLES, WORKER_ROLES } from '../../context/SessionContext';

interface UserOptionsProps {
  readonly anchorEl: HTMLElement | null;
  readonly onClose: () => void;
}

interface MenuLinkProps {
  readonly to: string;
  readonly icon: ReactNode;
  readonly onClick: () => void;
  readonly children: ReactNode;
}

function MenuLink({ to, icon, onClick, children }: MenuLinkProps) {
  return (
    <Button component={Link} to={to} startIcon={icon} onClick={onClick} sx={{ justifyContent: 'flex-start' }}>
      {children}
    </Button>
  );
}

export default function UserOptions({ anchorEl, onClose }: UserOptionsProps) {
  const { user } = useSession();
  const isWorker = user ? WORKER_ROLES.includes(user.role) : false;
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
          <MenuLink to="/profile" icon={<PersonIcon />} onClick={onClose}>
            Mi perfil
          </MenuLink>

          {isWorker && (
            <MenuLink to="/room-dashboard" icon={<DashboardIcon />} onClick={onClose}>
              Panel de gestión
            </MenuLink>
          )}

          {user?.role === ROLES.CLIENT && (
            <MenuLink to="/purchase-history" icon={<HistoryIcon />} onClick={onClose}>
              Historial de compras
            </MenuLink>
          )}

          <LogOutButton sx={{ justifyContent: 'flex-start' }} />
        </Stack>
      </Box>
    </Popover>
  );
}