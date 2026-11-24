import { isAxiosError } from 'axios';

export function getErrorMessage(error: unknown, fallback: string): string {
  const reason = isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message
    : undefined;

  return reason
    ? `${fallback}. Motivo: ${reason}`
    : fallback;
}
