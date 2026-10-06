const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequiredField(value) {
  return String(value ?? '').trim() ? undefined : REQUIRED_FIELD_MESSAGE;
}

export function validateLogInForm({ email, password }) {
  const errors = {};

  if (!email.trim()) {
    errors.email = REQUIRED_FIELD_MESSAGE;
  } else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'El correo electrónico no tiene un formato válido';
  }

  if (!password) {
    errors.password = REQUIRED_FIELD_MESSAGE;
  }

  return errors;
}
