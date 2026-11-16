import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

export type ServerErrors = Partial<Record<string, string | string[]>>

export function readServerErrors(error: any): ServerErrors {
  const responseData = error?.response?.data;
  const serverErrors: ServerErrors = {};

  if (responseData?.details && Array.isArray(responseData.details)) {
    for (const detail of responseData.details) {
      const fieldName = detail.path?.[0];
      if (fieldName) {
        serverErrors[fieldName] = detail.message;
      }
    }
  }

  return serverErrors;
}

export function parseTime(value: string | null | undefined): Dayjs | null {
    if (!value) {
        return null;
    }

    const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
    if (!match) {
        return null;
    }

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
        return null;
    }

    return dayjs().startOf('day').hour(hours).minute(minutes);
}

export function firstError(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function splitNames(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((value) => value.trim()).filter(Boolean);
}
