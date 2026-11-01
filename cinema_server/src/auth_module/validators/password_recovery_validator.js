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