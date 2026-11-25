import type { Dayjs } from 'dayjs';
import type { AudiovisualFormat, Director, Genre, Language } from '../types/movies';
import type { ServerErrors } from './movieFormUtils';

export interface MovieFormValues {
  title: string;
  synopsis: string;
  yearDate: Dayjs | null;
  durationTime: Dayjs | null;
  ratingId: number | '';
  genreIds: Genre[];
  directorIds: Director[];
  formatIds: AudiovisualFormat[];
  originalLang: Language | null;
  dubLangs: Language[];
  subLangs: Language[];
  posterFile: File | null;
  existingPoster: string | null;
}

const MAX_POSTER_SIZE_MB = 5;
const MAX_POSTER_SIZE_BYTES = MAX_POSTER_SIZE_MB * 1024 * 1024;
const POSTER_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];
const POSTER_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp'
];

export const POSTER_ACCEPT = [
  ...POSTER_MIME_TYPES,
  ...POSTER_EXTENSIONS
].join(',');

export function validatePosterFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const hasValidType = POSTER_MIME_TYPES.includes(file.type)
    && POSTER_EXTENSIONS.some((extension) => name.endsWith(extension));

  if (!hasValidType)
    return 'El póster debe ser una imagen JPG, PNG o WEBP.';

  if (file.size > MAX_POSTER_SIZE_BYTES)
    return `El póster no puede pesar más de ${MAX_POSTER_SIZE_MB} MB.`;

  return null;
}

export function validateAll(
  values: MovieFormValues,
  isCreate: boolean
): ServerErrors {
  const errors: ServerErrors = {};
  if (!values.title.trim()) errors.MOVIE_TITLE = 'Campo obligatorio';
  if (values.title.trim().length > 100) errors.MOVIE_TITLE = 'El título no puede exceder 100 caracteres.';
  if (!values.yearDate?.isValid()) {
    errors.PUBLISHING_YEAR = 'Seleccione el año de publicación.';
  } else {
    const year = values.yearDate.year();
    if (year < 1888) {
      errors.PUBLISHING_YEAR = 'El año debe ser 1888 o posterior a este año.';
    } else if (year > 2026) {
      errors.PUBLISHING_YEAR = 'El año no puede ser superior a 2026.';
    }
  }
  if (!values.durationTime?.isValid()) {
    errors.MOVIE_DURATION = 'Seleccione la duración.';
  } else {
    const totalMinutes = values.durationTime.hour() * 60 + values.durationTime.minute();
    if (totalMinutes <= 0) {
      errors.MOVIE_DURATION = 'La duración debe ser mayor a 0 minutos.';
    }
  }
  if (!values.synopsis.trim()) errors.SYNOPSIS = 'Campo obligatorio';
  if (values.synopsis.trim().length > 1000) errors.SYNOPSIS = 'La sinopsis no puede exceder los 1000 caracteres.';
  if (values.ratingId === '') errors.ID_RATING = 'Campo obligatorio';
  if (values.genreIds.length === 0) errors.GENRE_IDS = 'Seleccione al menos un género';
  if (values.directorIds.length === 0) errors.DIRECTOR_IDS = 'Seleccione al menos un director';
  if (values.formatIds.length === 0) errors.FORMAT_IDS = 'Seleccione al menos un formato';
  if (!values.originalLang) errors.LANGUAGES_ORIGINAL = 'Seleccione el idioma original';
  if (isCreate && !values.posterFile) errors.POSTER = 'Seleccione el póster';
  if (values.posterFile) {
    const posterError = validatePosterFile(values.posterFile);

    if (posterError)
      errors.POSTER = posterError;
  }
  if (!isCreate && !values.posterFile && !values.existingPoster) errors.POSTER = 'Seleccione el póster';
  return errors;
}
