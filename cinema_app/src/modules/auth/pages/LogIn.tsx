import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useLocation } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';

import AuthLayout from '../../../components/common/AuthLayout';
import PasswordField from '../../../components/common/PasswordField';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import useSession from '../../../hooks/useSession';
import { WORKER_ROLES, type SessionUser } from '../../../context/SessionContext';
import { useLogIn } from '../hooks/useLogIn';
import { validateLogInForm, validateRequiredField } from '../validators/authValidator';

type LogInFormValues = {
  email: string;
  password: string;
};

type LogInFormErrors = Partial<Record<keyof LogInFormValues, string>>;

type LogInResponse = {
  data: SessionUser;
};

type LogInErrorResponse = {
  errors?: LogInFormErrors;
  message?: string;
};

const INITIAL_VALUES: LogInFormValues = { email: '', password: '' };
const GENERIC_ERROR_MESSAGE = 'No se pudo iniciar sesión. Intenta de nuevo.';
const WORKER_HOME_PATH = '/movies';
const CLIENT_HOME_PATH = '/';

function getHomePath(user: SessionUser) {
  return WORKER_ROLES.includes(user.role) ? WORKER_HOME_PATH : CLIENT_HOME_PATH;
}

export default function LogIn() {
  const location = useLocation();
  const notifications = useNotifications();
  const { user, startSession } = useSession();
  const { logIn, isLoggingIn } = useLogIn();

  const [values, setValues] = useState<LogInFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<LogInFormErrors>({});

  if (user) {
    const requestedPath = (location.state as { from?: string } | null)?.from;
    return <Navigate to={requestedPath ?? getHomePath(user)} replace />;
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setValues((previousValues) => ({ ...previousValues, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const requiredError = validateRequiredField(value);
    if (requiredError) {
      setErrors((previousErrors) => ({ ...previousErrors, [name]: requiredError }));
    }
  };

  const handleLogInSuccess = (response: LogInResponse) => {
    startSession(response.data);
  };

  const handleLogInError = (error: Error) => {
    if (isAxiosError<LogInErrorResponse>(error) && error.response?.data?.errors) {
      setErrors(error.response.data.errors);
      return;
    }
    notifications.show(GENERIC_ERROR_MESSAGE, { severity: 'error' });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formErrors = validateLogInForm(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }
    logIn(values, { onSuccess: handleLogInSuccess, onError: handleLogInError });
  };

  return (
    <AuthLayout title="Iniciar sesión">
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
      >
        <RequiredFieldsHint />

        <FormControl fullWidth>
          <FormLabel htmlFor="email" required>Correo electrónico</FormLabel>
          <TextField
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            autoFocus
            required
            fullWidth
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={Boolean(errors.email)}
            helperText={errors.email}
          />
        </FormControl>

        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <Button type="submit" fullWidth variant="contained" disabled={isLoggingIn}>
          {isLoggingIn ? 'Ingresando…' : 'Iniciar sesión'}
        </Button>
      </Box>
      <Typography sx={{ textAlign: 'center' }}>
        ¿No tienes cuenta?{' '}
        <Link component={RouterLink} to="/register" variant="body2">
          Regístrate
        </Link>
      </Typography>
      <Typography sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/" variant="body2">
          Volver al inicio
        </Link>
      </Typography>
    </AuthLayout>
  );
}
