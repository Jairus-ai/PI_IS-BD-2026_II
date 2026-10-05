import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import MenuItem from '@mui/material/MenuItem';
import MuiCard from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import { isAxiosError } from 'axios';

import logo from '../../../assets/logo.png';
import useNotifications from '../../../hooks/useNotifications';
import useSession from '../../../hooks/useSession';
import type { SessionUser } from '../../../context/SessionContext';
import { useRegisterClient } from '../hooks/useRegisterClient';
import {
  checkPasswordStrength,
  MINIMUM_PASSWORD_SCORE,
  validateClientForm
} from '../validators/clientValidator';

type ClientFormValues = {
  email: string;
  password: string;
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

const GENERIC_ERROR_MESSAGE = 'No se pudo completar el registro. Intenta de nuevo.';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  margin: 'auto',
  boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05), 0px 15px 35px -5px rgba(0, 0, 0, 0.05)',
  [theme.breakpoints.up('sm')]: {
    width: '560px'
  }
}));

const SignUpContainer = styled(Stack)(({ theme }) => ({
  minHeight: '100dvh',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4)
  }
}));

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
      <FormLabel htmlFor={name}>{label}</FormLabel>
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

  const handleRegisterSuccess = ({ data }: { data: SessionUser }) => {
    startSession(data);
    notifications.show(`¡Bienvenido, ${data.firstName}! Tu cuenta fue creada.`, {
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

    register(values, { onSuccess: handleRegisterSuccess, onError: handleRegisterError });
  };

  const fieldProps = { values, errors, onChange: handleChange };
  const isPasswordWeak = Boolean(values.password) && passwordStrength.score < MINIMUM_PASSWORD_SCORE;

  return (
    <SignUpContainer direction="column" sx={{ justifyContent: 'center' }}>
      <Card variant="outlined">
        <Box component="img" src={logo} alt="CinePI" sx={{ height: 48, alignSelf: 'flex-start' }} />
        <Typography component="h1" variant="h4" sx={{ fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
          Crear cuenta
        </Typography>
        <Box
          component="form"
          noValidate
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <FormField
            label="Correo electrónico"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
            {...fieldProps}
          />

          <FormControl fullWidth>
            <FormLabel htmlFor="password">Contraseña</FormLabel>
            <TextField
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              required
              fullWidth
              value={values.password}
              onChange={handleChange}
              error={Boolean(errors.password)}
              helperText={errors.password}
            />
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
          </FormControl>

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
            <FormField label="Fecha de nacimiento" name="birthdate" type="date" required {...fieldProps} />
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
      </Card>
    </SignUpContainer>
  );
}
