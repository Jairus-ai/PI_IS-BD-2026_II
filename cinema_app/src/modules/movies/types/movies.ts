export type LanguageType = 'OG' | 'DUB' | 'SUB';

export interface Movie {
  ID_MOVIE: number;
  MOVIE_TITLE: string;
  PUBLISHING_YEAR: number;
  SYNOPSIS: string;
  MOVIE_DURATION: number;
  POSTER: string;
  ID_RATING: number;
  GENRES?: number[];
  DIRECTORS?: string[];
  LANGUAGES?: string[];
  FORMATS?: number[];
}

export interface MovieDetail {
  ID_MOVIE: number;
  MOVIE_TITLE: string;
  SYNOPSIS: string;
  MOVIE_DURATION: number;
  PUBLISHING_YEAR: number;
  POSTER: string | null;
  RATING_NAME: string | null;
  RATING_CODE: string | null;
  GENRES: string | null;
  DIRECTORS: string | null;
  FORMATS: string | null;
  LANGUAGES: string | null;
}

export interface Genre {
  ID_GENRE: number;
  GENRE_NAME: string;
}

export interface Rating {
  ID_RATING: number;
  RATING_NAME: string;
  RATING_CODE: string;
}

export interface Director {
  ID_DIRECTOR: number;
  DIRECTOR_FIRST_NAME: string;
  DIRECTOR_LAST_NAME: string;
}

export interface Language {
  ISO_CODE: string;
  LANGUAGE_NAME: string;
}

export interface AudiovisualFormat {
  ID_AUDIOVISUAL_FORMAT: number;
  VIDEO_FORMAT_NAME: string;
  AUDIO_FORMAT_NAME: string;
}

export interface Language {
  ISO_CODE: string;
  LANGUAGE_NAME: string;
}

export function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const minsStr = String(mins).padStart(2, '0');
  if (hours <= 0) return `00:${minsStr}`;
  if (mins === 0) return `${hours}:00`;
  return `${hours}:${minsStr}`;
}
