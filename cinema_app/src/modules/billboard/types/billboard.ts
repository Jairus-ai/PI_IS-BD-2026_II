import { API_BASE_URL } from '../../../services/api';

export interface BillboardMovie {
  ID_MOVIE: number;
  MOVIE_TITLE: string;
  POSTER: string | null;
}

export interface NowShowingMovie extends BillboardMovie {
  MOVIE_DURATION: number;
  RATING_CODE: string;
  GENRES: string | null;
}

//posters are full URLs or paths served by the server (/posters/...)
export function getPosterUrl(poster: string | null): string | null {
  if (!poster) {
    return null;
  }
  return poster.startsWith('http') ? poster : `${API_BASE_URL}${poster}`;
}
