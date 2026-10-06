const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const INVALID_EMAIL_MESSAGE = 'El correo electrónico no tiene un formato válido';
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogIn(body = {}) {
  const errors = {};
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email) {
    errors.email = REQUIRED_FIELD_MESSAGE;
  } else if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = INVALID_EMAIL_MESSAGE;
  }

  if (!password) {
    errors.password = REQUIRED_FIELD_MESSAGE;
  }

  return { errors, email, password };
}
