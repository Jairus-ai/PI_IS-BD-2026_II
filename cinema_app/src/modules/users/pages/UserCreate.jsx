import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import FormHelperText from '@mui/material/FormHelperText';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';

import dayjs from 'dayjs';
import 'dayjs/locale/es';

import PageContainer from '../../../components/common/PageContainer';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useSession from '../../../hooks/useSession';

import { useLocations } from '../hooks/useLocations.js';
import { validateRequiredField, validateUserForm,} from '../validators/userValidator.js';
import { useNavigate } from 'react-router';
import useNotifications from '../../../hooks/useNotifications';
import { useCreateUser } from '../hooks/useCreateUser.js';

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

const BIRTHDATE_FORMAT = 'DD/MM/YYYY';
const API_DATE_FORMAT = 'YYYY-MM-DD';

const DATE_PICKER_TEXT =
  esES.components.MuiLocalizationProvider.defaultProps.localeText;

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

function FormField({
  label,
  name,
  values,
  errors,
  onChange,
  children,
  ...textFieldProps
}) {
  return (
    <FormControl fullWidth>
      <FormLabel
        htmlFor={name}
        required={textFieldProps.required}
      >
        {label}
      </FormLabel>

      <TextField
        id={name}
        name={name}
        value={values[name]}
        onChange={onChange}
        error={Boolean(errors[name])}
        helperText={errors[name]}
        fullWidth
        {...textFieldProps}
      >
        {children}
      </TextField>
    </FormControl>
  );
}

export default function UserCreate() {
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState({});

  const { user } = useSession();

  const {
    locations,
    loadingLocations,
    locationsError,
  } = useLocations();

  const requiresLocations =
    values.role === 'EMPLOYEE' ||
    values.role === 'ADMINISTRATOR';

  const availableRoles =
    getAvailableRoles(user?.role);

  const navigate = useNavigate();
  const notifications = useNotifications();

  const {createUser, creatingUser} = useCreateUser();

  const fieldProps = {
    values,
    errors,
    onChange: handleChange,
    onBlur: handleBlur,
  };

  function handleChange(event) {
    const { name, value } = event.target;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
      ...(name === 'role' && value === 'CLIENT'
        ? { locations: [] }
        : {}),
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: undefined,
      ...(name === 'role'
        ? { locations: undefined }
        : {}),
    }));
  }

  function handleLocationsChange(event) {
    const value = event.target.value;

    setValues((currentValues) => ({
      ...currentValues,
      locations: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      locations: undefined,
    }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;

    const error =
      validateRequiredField(name, value);

    if (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        [name]: error,
      }));
    }
  }

  function handleBirthdateChange(birthdate) {
    const formattedBirthdate =
      birthdate?.isValid()
        ? birthdate.format(API_DATE_FORMAT)
        : '';

    setValues((currentValues) => ({
      ...currentValues,
      birthdate: formattedBirthdate,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      birthdate: undefined,
    }));
  }

  function handleBirthdateBlur() {
    const error = validateRequiredField(
      'birthdate',
      values.birthdate
    );

    if (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        birthdate: error,
      }));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (creatingUser) {
      return;
    }

    const formErrors = validateUserForm(values);

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    try {
      await createUser(values);

      notifications.show(
        'El usuario fue registrado correctamente. Se envió una contraseña temporal por correo.',
        {
          severity: 'success',
          autoHideDuration: 5000,
        }
      );

      navigate('/users');
    } catch (error) {
      if (error.errors) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          ...error.errors,
        }));

        return;
      }

      notifications.show(
        error.message || 'No fue posible crear el usuario.',
        {
          severity: 'error',
          autoHideDuration: 5000,
        }
      );
    }
  }

  return (
    <PageContainer title="Crear usuario">
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          maxWidth: 700,
        }}
      >
        <RequiredFieldsHint />

        <FormField
          label="Rol"
          name="role"
          select
          required
          {...fieldProps}
        >
          {availableRoles.map((role) => (
            <MenuItem
              key={role.value}
              value={role.value}
            >
              {role.label}
            </MenuItem>
          ))}
        </FormField>

        {requiresLocations && (
          <FormControl
            fullWidth
            error={Boolean(errors.locations)}
          >
            <FormLabel required>
              Sucursales
            </FormLabel>

            <Select
              multiple
              name="locations"
              value={values.locations}
              onChange={handleLocationsChange}
              disabled={loadingLocations}
              renderValue={(selected) =>
                selected
                  .map((locationId) => {
                    const location =
                      locations.find(
                        (item) =>
                          item.ID_LOCATION ===
                          locationId
                      );

                    return location?.LOCATION_NAME;
                  })
                  .filter(Boolean)
                  .join(', ')
              }
            >
              {locations.map((location) => (
                <MenuItem
                  key={location.ID_LOCATION}
                  value={location.ID_LOCATION}
                >
                  {location.LOCATION_NAME}
                </MenuItem>
              ))}
            </Select>

            {errors.locations && (
              <FormHelperText>
                {errors.locations}
              </FormHelperText>
            )}
          </FormControl>
        )}

        {requiresLocations && locationsError && (
          <Alert severity="error">
            No fue posible cargar las sucursales.
          </Alert>
        )}

        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          {...fieldProps}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <FormField
            label="Nombre"
            name="firstName"
            autoComplete="given-name"
            required
            {...fieldProps}
          />

          <FormField
            label="Segundo nombre (opcional)"
            name="middleName"
            {...fieldProps}
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <FormField
            label="Primer apellido"
            name="firstSurname"
            autoComplete="family-name"
            required
            {...fieldProps}
          />

          <FormField
            label="Segundo apellido (opcional)"
            name="lastSurname"
            {...fieldProps}
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <FormField
            label="Tipo de identificación"
            name="identificationType"
            select
            required
            {...fieldProps}
          >
            {IDENTIFICATION_TYPES.map((type) => (
              <MenuItem
                key={type.value}
                value={type.value}
              >
                {type.label}
              </MenuItem>
            ))}
          </FormField>

          <FormField
            label="Número de identificación"
            name="identificationNumber"
            required
            {...fieldProps}
          />
        </Stack>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <FormControl fullWidth>
            <FormLabel
              htmlFor="birthdate"
              required
            >
              Fecha de nacimiento
            </FormLabel>

            <LocalizationProvider
              dateAdapter={AdapterDayjs}
              adapterLocale="es"
              localeText={DATE_PICKER_TEXT}
            >
              <DatePicker
                value={
                  values.birthdate
                    ? dayjs(values.birthdate)
                    : null
                }
                onChange={handleBirthdateChange}
                format={BIRTHDATE_FORMAT}
                openTo="year"
                views={[
                  'year',
                  'month',
                  'day',
                ]}
                disableFuture
                slotProps={{
                  textField: {
                    id: 'birthdate',
                    fullWidth: true,
                    required: true,
                    onBlur:
                      handleBirthdateBlur,
                    error: Boolean(
                      errors.birthdate
                    ),
                    helperText:
                      errors.birthdate,
                  },
                }}
              />
            </LocalizationProvider>
          </FormControl>

          <FormField
            label="Celular"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            placeholder="8888-8888"
            required
            {...fieldProps}
          />
        </Stack>

        <Button
          type="submit"
          variant="contained"
          disabled={creatingUser}
        >
          {creatingUser ? 'Creando...' : 'Crear usuario'}
        </Button>
      </Box>
    </PageContainer>
  );
}