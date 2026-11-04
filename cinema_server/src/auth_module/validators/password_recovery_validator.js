import { validatePasswordStrength } from '../../shared/validators/password_validator.js';

export function validateRecoveryRequest(body = {}) {
  const email = typeof body.email === 'string'
    ? body.email.trim()
    : '';

  const errors = {};

  if (!email) {
    errors.email = 'Campo obligatorio';
  }

  return {
    errors,
    email,
  };
}

export function validateRecoveryCode(body = {}) {
  const email = typeof body.email === 'string'
    ? body.email.trim()
    : '';

  const code = typeof body.code === 'string'
    ? body.code.trim()
    : '';

  const errors = {};

  if (!email) {
    errors.email = 'Campo obligatorio';
  }

  if (!code) {
    errors.code = 'Campo obligatorio';
  }

  return {
    errors,
    email,
    code,
  };
}

export function validatePasswordReset(body = {}) {
  const email = typeof body.email === 'string'
    ? body.email.trim()
    : '';

  const code = typeof body.code === 'string'
    ? body.code.trim()
    : '';

  const newPassword = typeof body.newPassword === 'string'
    ? body.newPassword
    : '';

  const confirmPassword = typeof body.confirmPassword === 'string'
    ? body.confirmPassword
    : '';

  const errors = {};

  if (!email) {
    errors.email = 'Campo obligatorio';
  }

  if (!code) {
    errors.code = 'Campo obligatorio';
  }

  if (!newPassword) {
    errors.newPassword = 'Campo obligatorio';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Campo obligatorio';
  }

  if (
    newPassword &&
    confirmPassword &&
    newPassword !== confirmPassword
  ) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  let passwordSuggestions = [];

  if (newPassword) {
    const passwordValidation =
      validatePasswordStrength(newPassword);

    passwordSuggestions =
      passwordValidation.suggestions;

    if (passwordValidation.error) {
      errors.newPassword =
        passwordValidation.error;
    }
  }

  return {
    errors,
    passwordSuggestions,
    email,
    code,
    newPassword,
  };
}