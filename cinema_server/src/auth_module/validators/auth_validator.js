import { validatePasswordStrength } from '../../shared/validators/password_validator.js';

const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const INVALID_EMAIL_MESSAGE = 'El correo electrónico no tiene un formato válido';
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

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

export function validateChangePassword(body = {}) {
  const errors = {};

  const currentPassword =
    typeof body.currentPassword === 'string' ? body.currentPassword: '';

  const newPassword =
    typeof body.newPassword === 'string' ? body.newPassword: '';

  const confirmPassword =
    typeof body.confirmPassword === 'string' ? body.confirmPassword: '';

  if (!currentPassword) {
    errors.currentPassword = REQUIRED_FIELD_MESSAGE;
  }

  if (!newPassword) {
    errors.newPassword = REQUIRED_FIELD_MESSAGE;
  }

  if (!confirmPassword) {
    errors.confirmPassword = REQUIRED_FIELD_MESSAGE;
  }

  if (newPassword && confirmPassword && newPassword !== confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  let passwordSuggestions = [];

  if (newPassword) {
    const result = validatePasswordStrength(newPassword);
    if (result.error) {
      errors.newPassword = result.error;
    }
    passwordSuggestions = result.suggestions;
  }

  return {
    errors, passwordSuggestions, currentPassword, newPassword, confirmPassword
  };
}