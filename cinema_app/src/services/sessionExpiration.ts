import { isAxiosError } from 'axios';

const SESSION_EXPIRED_STORAGE_KEY = 'session-expired-message';
const SESSION_EXPIRED_MESSAGE = 'La sesión expiró. Inicia sesión de nuevo';
const AUTH_PATH_PREFIX = '/auth/';
const LOGIN_PATH = '/login';

export function isSessionExpiredError(error: unknown): boolean {
  return isAxiosError(error)
    && error.response?.status === 401
    && !error.config?.url?.startsWith(AUTH_PATH_PREFIX);
}

function saveSessionExpiredMessage(message: string) {
  try {
    sessionStorage.setItem(SESSION_EXPIRED_STORAGE_KEY, message);
  } catch {
    return;
  }
}

export function redirectToLogin(error: unknown) {
  const message = isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined;

  saveSessionExpiredMessage(message ?? SESSION_EXPIRED_MESSAGE);

  window.location.assign(LOGIN_PATH);
}

export function readSessionExpiredMessage(): string | null {
  try {
    return sessionStorage.getItem(SESSION_EXPIRED_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearSessionExpiredMessage() {
  try {
    sessionStorage.removeItem(SESSION_EXPIRED_STORAGE_KEY);
  } catch {
    return;
  }
}
