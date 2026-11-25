import { isAxiosError } from 'axios';
import dayjs, { type Dayjs } from 'dayjs';

const API_DATE_FORMAT = 'YYYY-MM-DD';

interface ErrorResponse {
  message?: string;
}

export function toApiDate(value: Dayjs | null): string {
  return value?.isValid()
    ? value.format(API_DATE_FORMAT)
    : '';
}

export function toPickerDate(value: string): Dayjs | null {
  return value
    ? dayjs(value)
    : null;
}

export function readServerMessage(error: unknown, fallbackMessage: string): string {
  return isAxiosError<ErrorResponse>(error) && error.response?.data?.message
    ? error.response.data.message
    : fallbackMessage;
}
