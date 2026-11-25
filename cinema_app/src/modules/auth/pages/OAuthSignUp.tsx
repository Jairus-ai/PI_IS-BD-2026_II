import { useState, type ChangeEvent, type FocusEvent, type FormEvent } from 'react';
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';

import AuthLayout from '../../../components/common/AuthLayout';
import { OAuthButton } from '../../../components/common/OAuthButtons';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import useSession from '../../../hooks/useSession';
import { validateRequiredUserField, validateUserData } from '../../../shared/validators/userDataValidator';
import ClientProfileFields, {
  FormField,
  type FieldErrors,
  type ProfileValues
} from '../../clients/components/ClientProfileFields';
import { useCompleteOAuthSignUp, useOAuthPendingProfile } from '../hooks/useOAuthSignUp';
import { isOAuthProvider, OAUTH_PROVIDERS, type OAuthProvider } from '../utils/oauthProviders';

type OAuthSignUpValues = ProfileValues & { email: string };

type CompleteErrorResponse = {
  errors?: FieldErrors;
  message?: string;
};

const TITLE = 'Completar registro';
const GENERIC_ERROR_MESSAGE = 'No se pudo completar el registro. Intenta de nuevo.';

const INITIAL_VALUES: OAuthSignUpValues = {
  email: '',
  firstName: '',
  middleName: '',
  firstSurname: '',
  lastSurname: '',
  identificationType: 'C',
  identificationNumber: '',
  birthdate: '',
  phoneNumber: ''
};

export default function OAuthSignUp() {
  const { provider } = useParams();

  if (!isOAuthProvider(provider)) {
    return <Navigate to="/login" replace />;
  }

  return <OAuthSignUpForm provider={provider} />;
}

function OAuthSignUpForm({ provider }: Readonly<{ provider: OAuthProvider }>) {
  const { label } = OAUTH_PROVIDERS[provider];
  const expiredMessage = `Tu registro con ${label} expiró. Inicia de nuevo para continuar.`;

  const navigate = useNavigate();
  const notifications = useNotifications();
  const { startSession } = useSession();
  const { profile, isLoadingProfile, isProfileError } = useOAuthPendingProfile(provider);
  const { completeSignUp, isCompleting } = useCompleteOAuthSignUp(provider);

  const [edits, setEdits] = useState<Partial<OAuthSignUpValues>>({});
  const [errors, setErrors] = useState<FieldErrors>({});

  const values: OAuthSignUpValues = {
    ...INITIAL_VALUES,
    email: profile?.email ?? '',
    firstName: profile?.firstName ?? '',
    middleName: profile?.middleName ?? '',
    firstSurname: profile?.firstSurname ?? '',
    lastSurname: profile?.lastSurname ?? '',
    ...edits
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setEdits((previousEdits) => ({ ...previousEdits, [name]: value }));
    setErrors((previousErrors) => ({ ...previousErrors, [name]: undefined }));
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const requiredError = validateRequiredUserField(name, value);
    if (requiredError) {
      setErrors((previousErrors) => ({ ...previousErrors, [name]: requiredError }));
    }
  };

  const handleBirthdateChange = (birthdate: string) => {
    setEdits((previousEdits) => ({ ...previousEdits, birthdate }));
    setErrors((previousErrors) => ({ ...previousErrors, birthdate: undefined }));
  };

  const handleBirthdateBlur = () => {
    const requiredError = validateRequiredUserField('birthdate', values.birthdate);
    if (requiredError) {
      setErrors((previousErrors) => ({ ...previousErrors, birthdate: requiredError }));
    }
  };

  const handleCompleteSuccess = (response: { data: Parameters<typeof startSession>[0] }): void => {
    const client = response.data;
    startSession(client);
    notifications.show(`¡Bienvenido, ${client.firstName}! Tu cuenta fue creada.`, {
      severity: 'success',
      autoHideDuration: 5000
    });
    navigate('/', { replace: true });
  };

  const handleCompleteError = (error: Error): void => {
    if (isAxiosError<CompleteErrorResponse>(error)) {
      const { status, data } = error.response ?? {};
      if (status === 401) {
        notifications.show(expiredMessage, { severity: 'warning', autoHideDuration: 5000 });
        navigate('/login', { replace: true });
        return;
      }
      if (data?.errors) {
        setErrors(data.errors);
        return;
      }
      if (data?.message) {
        notifications.show(data.message, { severity: 'error', autoHideDuration: 5000 });
        return;
      }
    }
    notifications.show(GENERIC_ERROR_MESSAGE, { severity: 'error', autoHideDuration: 5000 });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCompleting) {
      return;
    }

    const formErrors = validateUserData(values);
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) {
      return;
    }

    const { email: _email, ...clientProfile } = values;
    completeSignUp(clientProfile, { onSuccess: handleCompleteSuccess, onError: handleCompleteError });
  };

  if (isLoadingProfile) {
    return (
      <AuthLayout title={TITLE}>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      </AuthLayout>
    );
  }

  if (isProfileError) {
    return (
      <AuthLayout title={TITLE}>
        <Typography>{expiredMessage}</Typography>
        <OAuthButton provider={provider} />
        <Typography sx={{ textAlign: 'center' }}>
          <Link component={RouterLink} to="/login" variant="body2">
            Volver a iniciar sesión
          </Link>
        </Typography>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={TITLE} cardWidth={560}>
      <Typography color="text.secondary">
        {`Completa tus datos para terminar de crear tu cuenta con ${label}.`}
      </Typography>
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
          required
          slotProps={{ input: { readOnly: true } }}
          values={values}
          errors={errors}
          onChange={handleChange}
        />

        <ClientProfileFields
          values={values}
          errors={errors}
          onChange={handleChange}
          onBlur={handleBlur}
          onBirthdateChange={handleBirthdateChange}
          onBirthdateBlur={handleBirthdateBlur}
        />

        <Button type="submit" fullWidth variant="contained" disabled={isCompleting}>
          {isCompleting ? 'Registrando…' : 'Crear cuenta'}
        </Button>
      </Box>
      <Typography sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Cancelar
        </Link>
      </Typography>
    </AuthLayout>
  );
}