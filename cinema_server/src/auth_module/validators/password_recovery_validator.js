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