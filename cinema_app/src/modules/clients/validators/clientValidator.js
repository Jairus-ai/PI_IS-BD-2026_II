import { checkPasswordStrength, MINIMUM_PASSWORD_SCORE} from '../../../shared/validators/passwordValidator';

export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';

const MINIMUM_AGE = 18;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

const REQUIRED_FIELDS = [
  'email',
  'password',
  'confirmPassword',
  'firstName',
  'firstSurname',
  'identificationType',
  'identificationNumber',
  'birthdate',
  'phoneNumber'
];


export function validateRequiredField(fieldName, value) {
  if (REQUIRED_FIELDS.includes(fieldName) && !String(value ?? '').trim()) {
    return REQUIRED_FIELD_MESSAGE;
  }
  return undefined;
}

function isAdult(birthdateText) {
  const [year, month, day] = birthdateText.split('-').map(Number);
  const adulthoodDate = new Date(year + MINIMUM_AGE, month - 1, day);
  const today = new Date();
  return adulthoodDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function validateClientForm(values) {
  const errors = {};

  for (const fieldName of REQUIRED_FIELDS) {
    if (!String(values[fieldName] ?? '').trim()) {
      errors[fieldName] = REQUIRED_FIELD_MESSAGE;
    }
  }

  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'El correo electrónico no tiene un formato válido';
  }

  if (!errors.birthdate && !isAdult(values.birthdate)) {
    errors.birthdate = 'Debes ser mayor de edad para registrarte';
  }

  if (!errors.password && checkPasswordStrength(values.password, values).score < MINIMUM_PASSWORD_SCORE) {
    errors.password = 'La contraseña es débil';
  }

  if (!errors.confirmPassword && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  return errors;
}
