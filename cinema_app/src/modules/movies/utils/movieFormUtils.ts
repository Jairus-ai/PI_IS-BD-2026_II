import { isAxiosError } from 'axios';
import { API_BASE_URL } from '../../../services/api';

export type ServerErrors = Partial<Record<string, string | string[]>>;

export function readServerErrors(error: unknown): ServerErrors {
  if (isAxiosError(error)) {
    const details = error.response?.data?.error?.details as ServerErrors | undefined;
    return details ?? {};
  }
  return {};
}

export function firstError(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export function splitNames(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((x) => x.trim()).filter(Boolean);
}

export function parseLanguageEntry(entry: string): { name: string; type: string } | null {
  const m = entry.match(/^(.*)\s+\[([A-Za-z]+)\]\s*$/);
  if (!m) return null;
  return { name: m[1].trim(), type: m[2].trim().toUpperCase() };
}

export function posterUrl(poster: string | null): string | undefined {
  if (!poster) return undefined;
  if (poster.startsWith('http')) return poster;
  return `${API_BASE_URL}${poster}`;
}
