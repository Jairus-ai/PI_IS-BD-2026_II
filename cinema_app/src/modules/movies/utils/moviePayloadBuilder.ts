import type { Dayjs } from 'dayjs';
import type { MovieFormValues } from './movieFormValidation';

export function buildMoviePayload(values: MovieFormValues, posterPath: string) {
  const year = values.yearDate ? (values.yearDate as Dayjs).year() : 0;

  const durationInMinutes = values.durationTime
    ? (values.durationTime as Dayjs).hour() * 60 + (values.durationTime as Dayjs).minute()
    : 0;

  return {
    MOVIE_TITLE: values.title.trim(),
    PUBLISHING_YEAR: year,
    SYNOPSIS: values.synopsis.trim(),
    MOVIE_DURATION: durationInMinutes,
    POSTER: posterPath,
    ID_RATING: values.ratingId as number,
    GENRE_IDS: values.genreIds.map((genre) => genre.ID_GENRE),
    DIRECTOR_IDS: values.directorIds.map((director) => director.ID_DIRECTOR),
    FORMAT_IDS: values.formatIds.map((format) => format.ID_AUDIOVISUAL_FORMAT),
    LANGUAGES: [
      ...values.originalLangs.map((language) => ({ ISO_CODE: language.ISO_CODE, LANGUAGE_TYPE: 'OG' })),
      ...values.dubLangs.map((language) => ({ ISO_CODE: language.ISO_CODE, LANGUAGE_TYPE: 'DUB' })),
      ...values.subLangs.map((language) => ({ ISO_CODE: language.ISO_CODE, LANGUAGE_TYPE: 'SUB' })),
    ],
  };
}