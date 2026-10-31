import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { isAxiosError } from 'axios';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';

import AuthLayout from '../../../components/common/AuthLayout';
import PasswordField from '../../../components/common/PasswordField';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';

import { changePassword } from '../services/authService';
import { validateRequiredField } from '../validators/authValidator';
import { checkPasswordStrength, MINIMUM_PASSWORD_SCORE } from '../../clients/validators/clientValidator';

const INITIAL_VALUES = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const PASSWORD_STRENGTH_LABELS = [
  'Muy débil',
  'Débil',
  'Regular',
  'Fuerte',
  'Muy fuerte',
];

const GENERIC_ERROR_MESSAGE = 'No fue posible cambiar la contraseña.';

export default function ChangePassword() {
  const notifications = useNotifications();

  const [values, setValues] = useState(INITIAL_VALUES);

  const [errors, setErrors] = useState({});

  const [isChangingPassword, setIsChangingPassword] =
    useState(false);

  const passwordStrength = useMemo( () => checkPasswordStrength(values.newPassword, {}), [values.newPassword]);

  const isPasswordWeak = Boolean(values.newPassword) && passwordStrength.score < MINIMUM_PASSWORD_SCORE;

  const handleChange = (event) => {
    const { name, value } = event.target;

    setValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));

    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: undefined,
    }));
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    const requiredError = validateRequiredField(value);

    if (requiredError) {
      setErrors((previousErrors) => ({
        ...previousErrors,
        [name]: requiredError,
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formErrors = {};

    if (!values.currentPassword) {
      formErrors.currentPassword = 'Campo obligatorio';
    }

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
      formErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      return;
    }

    try {
        setIsChangingPassword(true);

        const response = await changePassword(values);

        notifications.show(response.message, {
            severity: 'success',
            autoHideDuration: 3000,
        });

        setValues(INITIAL_VALUES);

        } catch (error) {
        if (isAxiosError(error) && error.response?.data?.errors
        ) {
            setErrors(error.response.data.errors);
            return;
        }

        notifications.show(
            error.response?.data?.message || GENERIC_ERROR_MESSAGE,
            { severity: 'error' }
        );

        } finally {
        setIsChangingPassword(false);
        }
  };

  return (
    <AuthLayout title="Cambiar contraseña">
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          gap: 2,
        }}
      >
        <RequiredFieldsHint />

        <PasswordField
          label="Contraseña actual"
          name="currentPassword"
          autoComplete="current-password"
          value={values.currentPassword}
          error={errors.currentPassword}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <PasswordField
          label="Nueva contraseña"
          name="newPassword"
          autoComplete="new-password"
          value={values.newPassword}
          error={errors.newPassword}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {values.newPassword && (
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

          {isPasswordWeak && passwordStrength.suggestions.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2.5 }}>
              {passwordStrength.suggestions.map((suggestion) => (
                <Typography
                  component="li"
                  variant="caption"
                  key={suggestion}
                >
                  {suggestion}
                </Typography>
              ))}
            </Box>
          )}
        </PasswordField>
          

        <PasswordField
          label="Confirmar nueva contraseña"
          name="confirmPassword"
          autoComplete="new-password"
          value={values.confirmPassword}
          error={errors.confirmPassword}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isChangingPassword}
        >
          {isChangingPassword
            ? 'Guardando…'
            : 'Cambiar contraseña'}
        </Button>
      </Box>
    </AuthLayout>
  );
}