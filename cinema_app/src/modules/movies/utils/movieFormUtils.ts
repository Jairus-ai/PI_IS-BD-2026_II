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

export function parseLanguageEntry(entry: string): { name: string; type: LanguageType } | null {
  const lastBracketIndex = entry.lastIndexOf('[');
  if (lastBracketIndex === -1) return null;

  const name = entry.slice(0, lastBracketIndex).trim();
  const typeStr = entry.slice(lastBracketIndex + 1, entry.lastIndexOf(']')).trim();
  const type = typeStr.toUpperCase() as LanguageType;

  if (!VALID_LANGUAGE_TYPES.includes(type)) {
    return null;
  }

  return { name, type };
}

export function classifyLanguageEntries(
  entries: string[],
  langList: { ISO_CODE: string; LANGUAGE_NAME: string }[]
) {
  const originalLangs: { ISO_CODE: string; LANGUAGE_NAME: string }[] = [];
  const dubLangs: { ISO_CODE: string; LANGUAGE_NAME: string }[] = [];
  const subLangs: { ISO_CODE: string; LANGUAGE_NAME: string }[] = [];

  for (const entry of entries) {
    const parsed = parseLanguageEntry(entry);
    if (!parsed) continue;

    const found = langList.find((language) => language.LANGUAGE_NAME === parsed.name);
    if (!found) continue;

    const type: LanguageType = parsed.type as LanguageType;

    if (type === 'OG') {
      originalLangs.push({ ISO_CODE: found.ISO_CODE, LANGUAGE_NAME: found.LANGUAGE_NAME });
    } else if (type === 'DUB') {
      dubLangs.push({ ISO_CODE: found.ISO_CODE, LANGUAGE_NAME: found.LANGUAGE_NAME });
    } else if (type === 'SUB') {
      subLangs.push({ ISO_CODE: found.ISO_CODE, LANGUAGE_NAME: found.LANGUAGE_NAME });
    }
  }

  return { originalLangs, dubLangs, subLangs };
}


export function posterUrl(poster: string | null): string | undefined {
  if (!poster) return undefined;
  if (poster.startsWith('http')) return poster;
  return `${API_BASE_URL}${poster}`;
}
