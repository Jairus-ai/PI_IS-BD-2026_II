import { validateRequiredUserField, validateUserData} from '../../../shared/validators/userDataValidator';
import { checkPasswordStrength, MINIMUM_PASSWORD_SCORE} from '../../../shared/validators/passwordValidator';

const REQUIRED_PASSWORD_FIELDS = [
  'password',
  'confirmPassword',
];

export function validateRequiredField(fieldName, value) {
  const userFieldError = validateRequiredUserField(fieldName, value);

  if (userFieldError) {
    return userFieldError;
  }

  if (
    REQUIRED_PASSWORD_FIELDS.includes(fieldName) &&
    !String(value ?? '').trim()
  ) {
    return 'Campo obligatorio';
  }

  return undefined;
}

export function validateClientForm(values) {
  const errors = validateUserData(values);

  for (const fieldName of REQUIRED_PASSWORD_FIELDS) {
    if (!String(values[fieldName] ?? '').trim()) {
      errors[fieldName] = 'Campo obligatorio';
    }
  }

  if (!errors.password && checkPasswordStrength(values.password, values).score < MINIMUM_PASSWORD_SCORE) {
    errors.password = 'La contraseña es débil';
  }

  if (!errors.confirmPassword && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  return errors;
}
