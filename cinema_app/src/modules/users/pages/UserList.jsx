import { useMemo, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import {DataGrid, GridActionsCellItem,} from '@mui/x-data-grid';

import PageContainer from '../../../components/common/PageContainer';
import UserDetailDialog from '../components/UserDetailDialog.jsx';
import { useUsers } from '../hooks/useUsers.js';
import { useLocations } from '../hooks/useLocations.js';

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

export default function UserList() {
  const [filters, setFilters] = useState({
    name: '',
    role: '',
    status: '',
    locationId: '',
  });

  const [selectedUser, setSelectedUser] = useState(null);

  const { users, loading, error } = useUsers(filters);

  const {
    locations,
    loadingLocations,
    locationsError,
  } = useLocations();

  function handleChange(event) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  function clearFilters() {
    setFilters({
      name: '',
      role: '',
      status: '',
      locationId: '',
    });
  }

  const columns = useMemo(
    () => [
      {
        field: 'FULL_NAME',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 220,
        valueGetter: (value, row) =>
          [
            row.FIRST_NAME,
            row.MIDDLE_NAME,
            row.FIRST_SURNAME,
            row.LAST_SURNAME,
          ]
            .filter(Boolean)
            .join(' '),
      },
      {
        field: 'IDENTIFICATION_NUMBER',
        headerName: 'Identificación',
        width: 150,
      },
      {
        field: 'ROLE',
        headerName: 'Rol',
        width: 150,
        valueGetter: (value, row) => formatRole(row.ROLE),
      },
      {
        field: 'STATUS',
        headerName: 'Estado',
        width: 120,
        valueGetter: (value, row) => formatStatus(row.STATUS),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Acciones',
        width: 120,
        getActions: ({ row }) => [
          <GridActionsCellItem
            key="show"
            label="Mostrar"
            icon={
              <Box
                component="span"
                sx={{
                  fontWeight: 500,
                  color: 'primary.main',
                  border: '1px solid',
                  borderColor: 'primary.main',
                  borderRadius: 1,
                  px: 1.5,
                  py: 0.5,
                  '&:hover': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  },
                }}
              >
                Mostrar
              </Box>
            }
            onClick={() => setSelectedUser(row)}
            showInMenu={false}
          />,
        ],
      },
    ]
  );

  return (
    <PageContainer
      title="Usuarios"
      breadcrumbs={[]}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' } }}
        >
          <TextField
            label="Buscar por nombre"
            name="name"
            value={filters.name}
            onChange={handleChange}
            size="small"
          />

          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Rol</InputLabel>

            <Select
              label="Rol"
              name="role"
              value={filters.role}
              onChange={handleChange}
            >
              <MenuItem value="">Todos los roles</MenuItem>
              <MenuItem value="CLIENT">Cliente</MenuItem>
              <MenuItem value="SUPERUSER">Superusuario</MenuItem>
              <MenuItem value="ADMINISTRATOR">Administrador</MenuItem>
              <MenuItem value="EMPLOYEE">Empleado</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Estado</InputLabel>

            <Select
              label="Estado"
              name="status"
              value={filters.status}
              onChange={handleChange}
            >
              <MenuItem value="">Todos los estados</MenuItem>
              <MenuItem value="ACTIVE">Activo</MenuItem>
              <MenuItem value="INACTIVE">Inactivo</MenuItem>
            </Select>
          </FormControl>

          <FormControl
            size="small"
            sx={{ minWidth: 220 }}
            disabled={loadingLocations}
          >
            <InputLabel>Sucursal</InputLabel>

            <Select
              label="Sucursal"
              name="locationId"
              value={filters.locationId}
              onChange={handleChange}
            >
              <MenuItem value="">
                Todas las sucursales
              </MenuItem>

              {locations.map((location) => (
                <MenuItem
                  key={location.ID_LOCATION}
                  value={location.ID_LOCATION}
                >
                  {location.LOCATION_NAME}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            onClick={clearFilters}
          >
            Limpiar filtros
          </Button>
        </Stack>

        {locationsError && (
          <Alert severity="error">
            Error al cargar sucursales: {locationsError}
          </Alert>
        )}

        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {!loading && !error && users.length === 0 && (
          <Alert severity="info">
            No se encontraron usuarios.
          </Alert>
        )}

        <Box sx={{ width: '100%' }}>
          <DataGrid
            rows={users}
            columns={columns}
            getRowId={(row) => row.USER_KEY}
            loading={loading}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                  page: 0,
                },
              },
            }}
            sx={{
              minHeight: 400,
            }}
          />
          <UserDetailDialog
            user={selectedUser}
            open={selectedUser !== null}
            onClose={() => setSelectedUser(null)}
          />
        </Box>
      </Stack>
    </PageContainer>
  );
}