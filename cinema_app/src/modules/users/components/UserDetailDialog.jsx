import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';

function formatRole(role) {
  const roles = {
    CLIENT: 'Cliente',
    SUPERUSER: 'Superusuario',
    ADMINISTRATOR: 'Administrador',
    EMPLOYEE: 'Empleado',
  };

  return roles[role] || role;
}

function formatStatus(status) {
  const statuses = {
    ACTIVE: 'Activo',
    INACTIVE: 'Inactivo',
  };

  return statuses[status] || status;
}

function formatDate(date) {
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleDateString('es-CR');
}

function formatFullName(user) {
  if (!user) {
    return '';
  }

  return [
    user.FIRST_NAME,
    user.MIDDLE_NAME,
    user.FIRST_SURNAME,
    user.LAST_SURNAME,
  ]
    .filter(Boolean)
    .join(' ');
}

function DetailItem({ label, value }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'primary.dark' }}
      >
        {label}
      </Typography>

      <Typography variant="body1">
        {value || '-'}
      </Typography>
    </Box>
  );
}

export default function UserDetailDialog({
  user,
  open,
  onClose,
}) {
  if (!user) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'primary.dark',
          fontWeight: 700,
        }}
      >
        {formatFullName(user)}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ bgcolor: 'background.default' }}
      >
        <Stack spacing={2}>
          <DetailItem
            label="Identificación"
            value={user.IDENTIFICATION_NUMBER}
          />

          <DetailItem
            label="Correo"
            value={user.EMAIL}
          />

          <DetailItem
            label="Fecha de nacimiento"
            value={formatDate(user.BIRTHDATE)}
          />

          <DetailItem
            label="Teléfono"
            value={user.PHONE_NUMBER}
          />

          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'primary.dark' }}
            >
              Rol
            </Typography>

            <Box>
              <Chip
                label={formatRole(user.ROLE)}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>

          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'primary.dark' }}
            >
              Estado
            </Typography>

            <Box>
              <Chip
                label={formatStatus(user.STATUS)}
                color={
                  user.STATUS === 'ACTIVE'
                    ? 'success'
                    : 'default'
                }
              />
            </Box>
          </Box>

          {user.ROLE !== 'CLIENT' && (
            <DetailItem
              label="Sucursales"
              value={user.LOCATIONS}
            />
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}