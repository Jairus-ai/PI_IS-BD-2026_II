import { useMemo, useState, type ChangeEvent, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { esES } from '@mui/x-date-pickers/locales';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import { isAxiosError } from 'axios';

import AuthLayout from '../../../components/common/AuthLayout';
import PasswordField from '../../../components/common/PasswordField';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import useSession from '../../../hooks/useSession';
import type { SessionUser } from '../../../context/SessionContext';
import { useRegisterClient } from '../hooks/useRegisterClient';
import {
  checkPasswordStrength,
  MINIMUM_PASSWORD_SCORE,
  validateClientForm,
  validateRequiredField
} from '../validators/clientValidator';

type ClientFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  middleName: string;
  firstSurname: string;
  lastSurname: string;
  identificationType: string;
  identificationNumber: string;
  birthdate: string;
  phoneNumber: string;
};

type ClientFormErrors = Partial<Record<keyof ClientFormValues, string>>;

const INITIAL_VALUES: ClientFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  middleName: '',
  firstSurname: '',
  lastSurname: '',
  identificationType: 'C',
  identificationNumber: '',
  birthdate: '',
  phoneNumber: ''
};

const IDENTIFICATION_TYPES = [
  { value: 'C', label: 'Cédula' },
  { value: 'P', label: 'Pasaporte' },
  { value: 'D', label: 'DIMEX' }
];

const PASSWORD_STRENGTH_LABELS = ['Muy débil', 'Débil', 'Regular', 'Fuerte', 'Muy fuerte'];
type RegisterErrorResponse = {
  errors?: ClientFormErrors;
  passwordSuggestions?: string[];
};

const BIRTHDATE_FORMAT = 'DD/MM/YYYY';
const DATE_PICKER_TEXT = esES.components.MuiLocalizationProvider.defaultProps.localeText;
const API_DATE_FORMAT = 'YYYY-MM-DD';

type RegisterResponse = {
  data: SessionUser;
};

const GENERIC_ERROR_MESSAGE = 'No se pudo completar el registro. Intenta de nuevo.';

type FormFieldProps = Omit<TextFieldProps, 'name' | 'onChange'> & {
  label: string;
  name: keyof ClientFormValues;
  values: ClientFormValues;
  errors: ClientFormErrors;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
};

function FormField({ label, name, values, errors, onChange, ...textFieldProps }: FormFieldProps) {
  return (
    <FormControl fullWidth>
      <FormLabel htmlFor={name} required={textFieldProps.required}>{label}</FormLabel>
      <TextField
        id={name}
        name={name}
        value={values[name]}
        onChange={onChange}
        error={Boolean(errors[name])}
        helperText={errors[name]}
        fullWidth
        {...textFieldProps}
      />
    </FormControl>
  );
}

export default function ClientSignUp() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const { startSession } = useSession();
  const { register, isRegistering } = useRegisterClient();

  const [values, setValues] = useState<ClientFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<ClientFormErrors>({});
  const [serverPasswordSuggestions, setServerPasswordSuggestions] = useState<string[]>([]);

  const passwordStrength = useMemo(
    () => checkPasswordStrength(values.password, values),
    [values]
  );
  const passwordSuggestions = passwordStrength.suggestions.length > 0
    ? passwordStrength.suggestions
    : serverPasswordSuggestions;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((previousValues) => ({ ...previousValues, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const requiredError = validateRequiredField(name, value);
    if (requiredError) {
      setErrors((previousErrors) => ({ ...previousErrors, [name]: requiredError }));
    }
  };

  const handleBirthdateBlur = () => {
    const requiredError = validateRequiredField('birthdate', values.birthdate);
    if (requiredError) {
      setErrors((previousErrors) => ({ ...previousErrors, birthdate: requiredError }));
    }
  };

  const handleBirthdateChange = (birthdate: Dayjs | null) => {
    const formattedBirthdate = birthdate?.isValid() ? birthdate.format(API_DATE_FORMAT) : '';
    setValues((previousValues) => ({ ...previousValues, birthdate: formattedBirthdate }));
    setErrors((previousErrors) => ({ ...previousErrors, birthdate: undefined }));
  };

  const handleRegisterSuccess = (response: RegisterResponse) => {
    const client = response.data;
    startSession(client);
    notifications.show(`¡Bienvenido, ${client.firstName}! Tu cuenta fue creada.`, {
      severity: 'success',
      autoHideDuration: 5000
    });
    navigate('/');
  };

  const handleRegisterError = (error: Error) => {
    const serverResponse = isAxiosError<RegisterErrorResponse>(error) ? error.response?.data : undefined;
    if (serverResponse?.errors) {
      setErrors(serverResponse.errors);
      setServerPasswordSuggestions(serverResponse.passwordSuggestions ?? []);
      return;
    }
    notifications.show(GENERIC_ERROR_MESSAGE, { severity: 'error', autoHideDuration: 5000 });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isRegistering) {
      return;
    }

    const formErrors = validateClientForm(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    const { confirmPassword: _confirmPassword, ...client } = values;
    register(client, { onSuccess: handleRegisterSuccess, onError: handleRegisterError });
  };

  const fieldProps = { values, errors, onChange: handleChange, onBlur: handleBlur };
  const isPasswordWeak = Boolean(values.password) && passwordStrength.score < MINIMUM_PASSWORD_SCORE;

  return (
    <AuthLayout title="Crear cuenta" cardWidth={560}>
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <RequiredFieldsHint />

        <FormField
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          required
          {...fieldProps}
        />

        <PasswordField
          label="Contraseña"
          name="password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {values.password && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={(passwordStrength.score + 1) * 20}
                color={isPasswordWeak ? 'error' : 'success'}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Seguridad: {PASSWORD_STRENGTH_LABELS[passwordStrength.score]}
              </Typography>
            </Box>
          )}
          {isPasswordWeak && passwordSuggestions.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {passwordSuggestions.map((suggestion) => (
                <Typography component="li" variant="caption" key={suggestion}>
                  {suggestion}
                </Typography>
              ))}
            </Box>
          )}
        </PasswordField>

        <PasswordField
          label="Confirmar contraseña"
          name="confirmPassword"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormField label="Nombre" name="firstName" autoComplete="given-name" required {...fieldProps} />
          <FormField label="Segundo nombre (opcional)" name="middleName" {...fieldProps} />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormField label="Primer apellido" name="firstSurname" autoComplete="family-name" required {...fieldProps} />
          <FormField label="Segundo apellido (opcional)" name="lastSurname" {...fieldProps} />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ minWidth: { sm: 170 } }}>
            <FormField label="Tipo de identificación" name="identificationType" select required {...fieldProps}>
              {IDENTIFICATION_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </FormField>
          </Box>
          <FormField label="Número de identificación" name="identificationNumber" required {...fieldProps} />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl fullWidth>
            <FormLabel htmlFor="birthdate" required>Fecha de nacimiento</FormLabel>
            <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es" localeText={DATE_PICKER_TEXT}>
              <DatePicker
                value={values.birthdate ? dayjs(values.birthdate) : null}
                onChange={handleBirthdateChange}
                format={BIRTHDATE_FORMAT}
                openTo="year"
                views={['year', 'month', 'day']}
                disableFuture
                slotProps={{
                  textField: {
                    id: 'birthdate',
                    fullWidth: true,
                    required: true,
                    onBlur: handleBirthdateBlur,
                    error: Boolean(errors.birthdate),
                    helperText: errors.birthdate
                  }
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

        <Button type="submit" fullWidth variant="contained" disabled={isRegistering}>
          {isRegistering ? 'Registrando…' : 'Registrarme'}
        </Button>
      </Box>
      <Typography sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/" variant="body2">
          Volver al inicio
        </Link>
      </Typography>
    </AuthLayout>
  );
}
