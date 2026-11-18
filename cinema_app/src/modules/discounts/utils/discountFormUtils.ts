import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

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

dayjs.extend(customParseFormat);

export function parseDate(value: string | null | undefined): Dayjs | null {
    if (!value) {
        return null;
    }

    const parsed = dayjs(value.trim(), ['YYYY-MM-DD', 'DD/MM/YYYY'], true);

    return parsed.isValid() ? parsed : null;
}

export function firstError(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function splitNames(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((value) => value.trim()).filter(Boolean);
}
