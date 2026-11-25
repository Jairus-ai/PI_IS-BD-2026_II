import { API_BASE_URL } from '../../../services/api';

export function getPosterSrc(poster: string | null): string | null {
  if (!poster) {
    return null;
  }
  if (/^https?:\/\//.test(poster)) {
    return poster;
  }
  return `${API_BASE_URL}${poster.startsWith('/') ? '' : '/'}${poster}`;
}