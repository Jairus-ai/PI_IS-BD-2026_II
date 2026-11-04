import dayjs from 'dayjs';
import type {
  AudiovisualFormat,
  Director,
  Genre,
  Language,
  MovieDetail,
  Rating,
} from '../types/movies';
import type { MovieFormValues } from './movieFormValidation';
import { classifyLanguageEntries, splitNames } from './movieFormUtils';

interface Catalogs {
  genres: Genre[];
  ratings: Rating[];
  languages: Language[];
  formats: AudiovisualFormat[];
  directors: Director[];
}

export function mapDetailToFormValues(
  detail: MovieDetail,
  catalogs: Catalogs
): MovieFormValues {
  const yearDate = detail.PUBLISHING_YEAR
    ? dayjs(`${detail.PUBLISHING_YEAR}-01-01`)
    : null;

  let durationTime = null;
  if (detail.MOVIE_DURATION != null) {
    const hours = Math.floor(detail.MOVIE_DURATION / 60);
    const minutes = detail.MOVIE_DURATION % 60;
    durationTime = dayjs().startOf('day').hour(hours).minute(minutes);
  }

  const matchedRating = catalogs.ratings.find(
    (rating) => rating.RATING_CODE === detail.RATING_CODE
  );
  const ratingId = matchedRating ? matchedRating.ID_RATING : '';

  const genreNames = splitNames(detail.GENRES);
  const genreIds = catalogs.genres.filter((genre) =>
    genreNames.includes(genre.GENRE_NAME)
  );

  const directorNames = splitNames(detail.DIRECTORS);
  const directorIds = catalogs.directors.filter((director) =>
    directorNames.includes(`${director.DIRECTOR_FIRST_NAME} ${director.DIRECTOR_LAST_NAME}`)
  );

  const formatNames = splitNames(detail.FORMATS);
  const formatIds = catalogs.formats.filter((format) =>
    formatNames.includes(`${format.VIDEO_FORMAT_NAME} ${format.AUDIO_FORMAT_NAME}`)
  );

  const langEntries = detail.LANGUAGES
    ? detail.LANGUAGES.split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];
  const { originalLangs, dubLangs, subLangs } = classifyLanguageEntries(
    langEntries,
    catalogs.languages
  );

  return {
    title: detail.MOVIE_TITLE ?? '',
    synopsis: detail.SYNOPSIS ?? '',
    yearDate,
    durationTime,
    ratingId,
    genreIds,
    directorIds,
    formatIds,
    originalLangs,
    dubLangs,
    subLangs,
    posterFile: null,
    existingPoster: detail.POSTER ?? null,
  };
}