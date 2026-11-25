export const OAUTH_PROVIDERS = {
  google: { label: 'Google' },
  facebook: { label: 'Facebook' }
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export const OAUTH_PROVIDER_IDS = Object.keys(OAUTH_PROVIDERS) as OAuthProvider[];

export function isOAuthProvider(value: string | undefined): value is OAuthProvider {
  return OAUTH_PROVIDER_IDS.some((id) => id === value);
}

const ERROR_MESSAGES: Record<string, (providerLabel: string) => string> = {
  cancelled: (label) => `Cancelaste el inicio de sesión con ${label}.`,
  state_invalid: () => 'La solicitud expiró. Inténtalo de nuevo.',
  email_missing: (label) => `${label} no compartió tu correo. Permite el acceso al correo e inténtalo de nuevo.`,
  email_not_verified: (label) => `Tu correo de ${label} no está verificado.`,
  staff_not_allowed: (label) => `Las cuentas del personal no pueden usar ${label}. Inicia sesión con tu correo y contraseña.`,
  failed: (label) => `No fue posible iniciar sesión con ${label}. Inténtalo de nuevo.`
};

export function getOAuthErrorMessage(errorCode: string | null): string | undefined {
  if (!errorCode) {
    return undefined;
  }
  const separatorIndex = errorCode.indexOf('_');
  const providerId = errorCode.slice(0, separatorIndex);
  if (separatorIndex < 0 || !isOAuthProvider(providerId)) {
    return undefined;
  }
  const { label } = OAUTH_PROVIDERS[providerId];
  const buildMessage = ERROR_MESSAGES[errorCode.slice(separatorIndex + 1)] ?? ERROR_MESSAGES.failed;
  return buildMessage(label);
}