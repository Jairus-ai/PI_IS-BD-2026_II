import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

export type ServerErrors = Partial<Record<string, string | string[]>>

export function readServerErrors(error: any): ServerErrors {
  const Errors: ServerErrors = {};
  const response = error?.response?.data;

  if (response?.details && Array.isArray(response.details)) 
    {
    for (const detail of response.details)
      {
        const fieldName = detail.path?.[0];
        if (fieldName)
        {
          Errors[fieldName] = detail.message;
        }
    }
  }

  return Errors;
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
