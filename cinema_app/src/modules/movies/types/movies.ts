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

export interface Genre {
  ID_GENRE: number;
  GENRE_NAME: string;
}

export interface Rating {
  ID_RATING: number;
  RATING_NAME: string;
  RATING_CODE: string;
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