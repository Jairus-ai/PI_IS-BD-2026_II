import { isAxiosError } from 'axios';
import { API_BASE_URL } from '../../../services/api';
import { LanguageType } from '../types/movies';

const VALID_LANGUAGE_TYPES = ['OG', 'DUB', 'SUB'] as const;

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

export function parseLanguageEntry(entry: string): { isoCode: string; type: LanguageType } | null {
  const lastBracketIndex = entry.lastIndexOf('[');
  if (lastBracketIndex === -1) return null;

  const name = entry.slice(0, lastBracketIndex).trim();
  const typeStr = entry.slice(lastBracketIndex + 1, entry.lastIndexOf(']')).trim();
  const type = typeStr.toUpperCase() as LanguageType;

  if (!VALID_LANGUAGE_TYPES.includes(type)) {
    return null;
  }

  return { isoCode: name, type };
}

export function posterUrl(poster: string | null): string | undefined {
  if (!poster) return undefined;
  if (poster.startsWith('http')) return poster;
  return `${API_BASE_URL}${poster}`;
}
