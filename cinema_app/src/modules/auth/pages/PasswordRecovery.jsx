import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { isAxiosError } from 'axios';
import { useNavigate, useLocation } from 'react-router';

import AuthLayout from '../../../components/common/AuthLayout';
import PasswordField from '../../../components/common/PasswordField';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import useSession from '../../../hooks/useSession';
import { establishPassword, requestPasswordRecovery, verifyPasswordRecoveryCode, resetPassword, getCurrentUser} from '../services/authService';
import {checkPasswordStrength, MINIMUM_PASSWORD_SCORE,} from '../../../shared/validators/passwordValidator';

const PASSWORD_STRENGTH_LABELS = [
  'Muy débil',
  'Débil',
  'Regular',
  'Fuerte',
  'Muy fuerte',
];

export default function PasswordRecovery() {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { startSession } = useSession();
  
  const location = useLocation();

  const isEstablishingTemporaryPassword =
    location.state?.establishPassword === true;

  const [step, setStep] = useState(
    isEstablishingTemporaryPassword ? 3 : 1
  );

  const [values, setValues] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(
    () => checkPasswordStrength(values.newPassword, {}),
    [values.newPassword]
  );

  const isPasswordWeak =
    Boolean(values.newPassword) &&
    passwordStrength.score < MINIMUM_PASSWORD_SCORE;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  };

  const handleRequestCode = async (event) => {
    event.preventDefault();

    if (!values.email) {
      setErrors({
        email: 'Campo obligatorio',
      });
      return;
    }

    try {
      setLoading(true);

      await requestPasswordRecovery(values.email);

      notifications.show(
        'Código enviado al correo electrónico',
        { severity: 'success' }
      );

      setStep(2);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        return;
      }

      notifications.show(
        'No fue posible enviar el código',
        { severity: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event) => {
    event.preventDefault();

    if (!values.code) {
      setErrors({
        code: 'Campo obligatorio',
      });
      return;
    }

    try {
      setLoading(true);

      await verifyPasswordRecoveryCode({
        email: values.email,
        code: values.code,
      });

      setStep(3);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        return;
      }

      notifications.show(
        'No fue posible verificar el código',
        { severity: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    const formErrors = {};

    if (!values.newPassword) {
      formErrors.newPassword = 'Campo obligatorio';
    }

    if (!values.confirmPassword) {
      formErrors.confirmPassword = 'Campo obligatorio';
    }

    if (
      values.newPassword &&
      values.confirmPassword &&
      values.newPassword !== values.confirmPassword
    ) {
      formErrors.confirmPassword =
        'Las contraseñas no coinciden';
    }

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);

      let response;

      if (isEstablishingTemporaryPassword) {
        response = await establishPassword({
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        });
      } else {
        response = await resetPassword({
          email: values.email,
          code: values.code,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        });
      }

      const currentUser = await getCurrentUser();

      startSession(currentUser.data);

      notifications.show(response.message, {
        severity: 'success',
      });

       await navigate('/');
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        setErrors(error.response.data.errors);
        return;
      }

      notifications.show(
        'No fue posible restablecer la contraseña',
        { severity: 'error' }
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Establecer contraseña">
      {step === 1 && (
        <Box
          component="form"
          onSubmit={handleRequestCode}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <RequiredFieldsHint />

          <TextField
            label="Correo electrónico"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            error={Boolean(errors.email)}
            helperText={errors.email}
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Enviar código'}
          </Button>
        </Box>
      )}

      {step === 2 && (
        <Box
          component="form"
          onSubmit={handleVerifyCode}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <Typography variant="body2">
            Ingresa el código enviado a tu correo.
          </Typography>

          <TextField
            label="Código de verificación"
            name="code"
            value={values.code}
            onChange={handleChange}
            error={Boolean(errors.code)}
            helperText={errors.code}
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Verificando…' : 'Verificar código'}
          </Button>

          <Button
            variant="text"
            onClick={async () => {
              await requestPasswordRecovery(values.email);

              notifications.show(
                'Se envió un nuevo código',
                { severity: 'success' }
              );
            }}
          >
            Reenviar código
          </Button>
        </Box>
      )}

      {step === 3 && (
        <Box
          component="form"
          onSubmit={handleResetPassword}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <PasswordField
            label="Nueva contraseña"
            name="newPassword"
            value={values.newPassword}
            error={errors.newPassword}
            onChange={handleChange}
          >
            {values.newPassword && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={(passwordStrength.score + 1) * 20}
                  color={isPasswordWeak ? 'error' : 'success'}
                />

                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary' }}
                >
                  Seguridad:{' '}
                  {PASSWORD_STRENGTH_LABELS[
                    passwordStrength.score
                  ]}
                </Typography>
              </Box>
            )}

            {isPasswordWeak &&
              passwordStrength.suggestions.length > 0 && (
                <Box
                  component="ul"
                  sx={{ m: 0, mt: 0.5, pl: 2.5 }}
                >
                  {passwordStrength.suggestions.map(
                    (suggestion) => (
                      <Typography
                        component="li"
                        variant="caption"
                        key={suggestion}
                      >
                        {suggestion}
                      </Typography>
                    )
                  )}
                </Box>
              )}
          </PasswordField>

          <PasswordField
            label="Confirmar nueva contraseña"
            name="confirmPassword"
            value={values.confirmPassword}
            error={errors.confirmPassword}
            onChange={handleChange}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
          >
            {loading
              ? 'Guardando…'
              : 'Establecer contraseña'}
          </Button>
        </Box>
      )}
    </AuthLayout>
  );
}