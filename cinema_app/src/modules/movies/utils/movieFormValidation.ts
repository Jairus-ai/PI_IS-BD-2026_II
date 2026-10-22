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
  originalLangs: Language[];
  posterFile: File | null;
  existingPoster: string | null;
  isCreate: boolean;
}

export function validateAll(values: MovieFormValues): ServerErrors {
  const errors: ServerErrors = {};
  if (!values.title.trim()) errors.MOVIE_TITLE = 'Campo obligatorio';
  if (!values.yearDate?.isValid()) errors.PUBLISHING_YEAR = 'Seleccione el año';
  if (!values.durationTime?.isValid()) errors.MOVIE_DURATION = 'Seleccione la duración';
  if (!values.synopsis.trim()) errors.SYNOPSIS = 'Campo obligatorio';
  if (values.ratingId === '') errors.ID_RATING = 'Campo obligatorio';
  if (values.genreIds.length === 0) errors.GENRE_IDS = 'Seleccione al menos un género';
  if (values.directorIds.length === 0) errors.DIRECTOR_IDS = 'Seleccione al menos un director';
  if (values.formatIds.length === 0) errors.FORMAT_IDS = 'Seleccione al menos un formato';
  if (values.originalLangs.length === 0) errors.LANGUAGES_ORIGINAL = 'Seleccione al menos un idioma original';
  if (values.isCreate && !values.posterFile) errors.POSTER = 'Seleccione el póster';
  if (!values.isCreate && !values.posterFile && !values.existingPoster) errors.POSTER = 'Seleccione el póster';
  return errors;
}
