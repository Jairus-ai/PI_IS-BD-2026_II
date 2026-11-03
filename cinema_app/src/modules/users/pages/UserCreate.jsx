import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

import PageContainer from '../../../components/common/PageContainer';
import { useLocations } from '../hooks/useLocations.js';
import useSession from '../../../hooks/useSession';

const INITIAL_VALUES = {
  role: 'CLIENT',
  email: '',
  firstName: '',
  middleName: '',
  firstSurname: '',
  lastSurname: '',
  identificationType: 'C',
  identificationNumber: '',
  birthdate: '',
  phoneNumber: '',
  locations: [],
};

const ROLE_OPTIONS = {
    CLIENT: {
        value: 'CLIENT',
        label: 'Cliente',
    },
    EMPLOYEE: {
        value: 'EMPLOYEE',
        label: 'Empleado',
    },
    ADMINISTRATOR: {
        value: 'ADMINISTRATOR',
        label: 'Administrador',
    },
};

const IDENTIFICATION_TYPES = [
  { value: 'C', label: 'Cédula' },
  { value: 'P', label: 'Pasaporte' },
  { value: 'D', label: 'DIMEX' },
];

function getAvailableRoles(userRole) {
  if (userRole === 'SUPERUSER') {
    return [
      ROLE_OPTIONS.CLIENT,
      ROLE_OPTIONS.EMPLOYEE,
      ROLE_OPTIONS.ADMINISTRATOR,
    ];
  }

  if (userRole === 'ADMINISTRATOR') {
    return [
      ROLE_OPTIONS.CLIENT,
      ROLE_OPTIONS.EMPLOYEE,
    ];
  }

  return [
    ROLE_OPTIONS.CLIENT,
  ];
}

export default function UserCreate() {
  const [values, setValues] = useState(INITIAL_VALUES);

  const { user } = useSession();

  const {
    locations,
    loadingLocations,
    locationsError,
  } = useLocations();

  const requiresLocations = values.role === 'EMPLOYEE' || values.role === 'ADMINISTRATOR';

  const availableRoles = getAvailableRoles(user?.role);

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  function handleLocationsChange(event) {
    const value = event.target.value;

    setValues((currentValues) => ({
        ...currentValues,
        locations: event.target.value,
    }));
  }

  return (
    <PageContainer title="Crear usuario">
      <Box
        component="form"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 700,
        }}
      >
        <TextField
          select
          label="Rol"
          name="role"
          value={values.role}
          onChange={handleChange}
          required
        >
          {availableRoles.map((role) => (
            <MenuItem key={role.value} value={role.value}>
              {role.label}
            </MenuItem>
          ))}
        </TextField>

        {requiresLocations && (
            <TextField
                select
                label="Sucursales"
                value={values.locations}
                onChange={handleLocationsChange}
                required
                disabled={loadingLocations}
                SelectProps={{
                    multiple: true,
                }}
            >
            {locations.map((location) => (
                <MenuItem
                    key={location.ID_LOCATION}
                    value={location.ID_LOCATION}
                >
                    {location.LOCATION_NAME}
                </MenuItem>
                ))}
            </TextField>
        )}

        {requiresLocations && locationsError && (
            <Alert severity="error">
                No fue posible cargar las sucursales.
            </Alert>
        )}

        <TextField
          label="Correo electrónico"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          required
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Nombre"
            name="firstName"
            value={values.firstName}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Segundo nombre"
            name="middleName"
            value={values.middleName}
            onChange={handleChange}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Primer apellido"
            name="firstSurname"
            value={values.firstSurname}
            onChange={handleChange}
            fullWidth
            required
          />

          <TextField
            label="Segundo apellido"
            name="lastSurname"
            value={values.lastSurname}
            onChange={handleChange}
            fullWidth
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            select
            label="Tipo de identificación"
            name="identificationType"
            value={values.identificationType}
            onChange={handleChange}
            fullWidth
            required
          >
            {IDENTIFICATION_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Número de identificación"
            name="identificationNumber"
            value={values.identificationNumber}
            onChange={handleChange}
            fullWidth
            required
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Fecha de nacimiento"
            name="birthdate"
            type="date"
            value={values.birthdate}
            onChange={handleChange}
            fullWidth
            required
            slotProps={{
              inputLabel: {
                shrink: true,
              },
            }}
          />

          <TextField
            label="Celular"
            name="phoneNumber"
            value={values.phoneNumber}
            onChange={handleChange}
            fullWidth
            required
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
        >
          Crear usuario
        </Button>
      </Box>
    </PageContainer>
  );
}