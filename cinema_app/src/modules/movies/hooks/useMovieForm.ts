import * as React from 'react';
import { Dayjs } from 'dayjs';
import { useMovies } from './useMovies';
import useNotifications from '../../../hooks/useNotifications';
import type {
  AudiovisualFormat,
  Director,
  Genre,
  Language,
  MovieDetail,
  Rating
} from '../types/movies';
import { posterUrl, readServerErrors } from '../utils/movieFormUtils';
import { validateAll, MovieFormValues } from '../utils/movieFormValidation';
import type { ServerErrors } from '../utils/movieFormUtils';
import { mapDetailToFormValues } from '../utils/movieFormHydration';
import { buildMoviePayload } from '../utils/moviePayloadBuilder';

const initialFormValues: MovieFormValues = {
  title: '',
  synopsis: '',
  yearDate: null,
  durationTime: null,
  ratingId: '',
  genreIds: [],
  directorIds: [],
  formatIds: [],
  originalLangs: [],
  dubLangs: [],
  subLangs: [],
  posterFile: null,
  existingPoster: null,
};

export interface UseMovieFormArgs {
  movieId: number | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function useMovieForm({ movieId, open, onClose, onSaved }: UseMovieFormArgs) {
  const isCreate = movieId == null;

  const notifications = useNotifications();

  const {
    movieDetail,
    isLoadingDetail,
    genres,
    ratings,
    languages,
    formats,
    directors,
    isLoadingCatalogs,
    uploadPoster,
    createMovie,
    updateMovie,
    isCreatingMovie,
    isUpdatingMovie,
  } = useMovies(1, open && !isCreate ? movieId : null);

  const [values, setValues] = React.useState(initialFormValues);

  const [posterPreview, setPosterPreview] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<ServerErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [uploading, setUploading] = React.useState(false);

  const touchedRef = React.useRef<Record<string, boolean>>({});

  const detail = movieDetail as MovieDetail | null;
  const catalogs = { genres, ratings, languages, formats, directors };
  const saving = uploading || isCreatingMovie || isUpdatingMovie;
  const loading = !isCreate && (isLoadingDetail || isLoadingCatalogs);

  const validateAndSet = (
    merged: MovieFormValues,
    touchedMap: Record<string, boolean>,
  ) => {
    const all = validateAll(merged, isCreate);
    const next: ServerErrors = {};
    for (const key of Object.keys(all)) {
      if (touchedMap[key]) next[key] = all[key];
    }
    setFieldErrors(next);
  };

  const touchAndValidate = (
    name: string,
    currentValues: MovieFormValues = values
  ) => {
    const nextTouched = { ...touchedRef.current, [name]: true };
    touchedRef.current = nextTouched;
    setTouched(nextTouched);
    validateAndSet(currentValues, nextTouched);
  };

  const setFieldValue = <K extends keyof MovieFormValues>(
    field: K,
    value: MovieFormValues[K],
  ) => {
    setValues((prev) => {
      const updated = { ...prev, [field]: value };
      touchAndValidate(field as string, updated);
      return updated;
    });
  };

  const handleBlur = (name: string) => () => {
    touchAndValidate(name);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValue('title', event.target.value);
  };

  const handleSynopsisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFieldValue('synopsis', event.target.value);
  };

  const handleYearChange = (year: Dayjs | null) => {
    setFieldValue('yearDate', year);
  };

  const handleDurationChange = (duration: Dayjs | null) => {
    setFieldValue('durationTime', duration);
  };

  const handleRatingChange = (rating: number) => {
    setFieldValue('ratingId', rating);
  };

  const handleGenresChange = (genres: Genre[]) => {
    setFieldValue('genreIds', genres);
  };

  const handleDirectorsChange = (directors: Director[]) => {
    setFieldValue('directorIds', directors);
  };

  const handleFormatsChange = (formats: AudiovisualFormat[]) => {
    setFieldValue('formatIds', formats);
  };

  const handleOriginalLangsChange = (languages: Language[]) => {
    setFieldValue('originalLangs', languages);
  };

  const handlePosterChange = (file: File | null) => {
    setFieldValue('posterFile', file);
  };

  React.useEffect(() => {
    if (!open) return;

    touchedRef.current = {};
    setTouched({});
    setFieldErrors({});

    if (isCreate) {
      setValues(initialFormValues);
      return;
    }

    if (detail && !isLoadingCatalogs) {
      const hydratedValues = mapDetailToFormValues(detail, {
        genres: genres as Genre[],
        ratings: ratings as Rating[],
        languages: languages as Language[],
        formats: formats as AudiovisualFormat[],
        directors: directors as Director[],
      });
      setValues(hydratedValues);
    }
  }, [
    open,
    detail,
    isLoadingCatalogs,
    isCreate,
    genres,
    ratings,
    languages,
    formats,
    directors
  ]);

  React.useEffect(() => {
    if (!values.posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(values.posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [values.posterFile]);

  const previewSrc = posterPreview ??
    (!isCreate
      ? posterUrl(values.existingPoster)
      : undefined);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const allTouched: Record<string, boolean> = {
      MOVIE_TITLE: true,
      SYNOPSIS: true,
      PUBLISHING_YEAR: true,
      MOVIE_DURATION: true,
      ID_RATING: true,
      GENRE_IDS: true,
      DIRECTOR_IDS: true,
      FORMAT_IDS: true,
      LANGUAGES_ORIGINAL: true,
      POSTER: true,
    };

    touchedRef.current = allTouched;
    setTouched(allTouched);

    const all = validateAll(values, isCreate);
    setFieldErrors(all);
    if (Object.keys(all).length > 0) return;

    try {
      setUploading(true);
      let posterPath = isCreate ? '' : (values.existingPoster ?? '');

      if (values.posterFile) {
        const uploadResult = await uploadPoster(values.posterFile);
        posterPath = uploadResult?.data?.poster as string;
      }
      setUploading(false);

      const payload = buildMoviePayload(values, posterPath);

      if (isCreate) {
        await createMovie(payload);
        notifications.show(
          'Película creada correctamente.',
          { severity: 'success', autoHideDuration: 5000 });
      } else {
        await updateMovie(movieId as number, payload);
        notifications.show(
          'Película actualizada correctamente.',
          { severity: 'success', autoHideDuration: 5000 });
      }

      setFieldErrors({});
      onClose();
      onSaved?.();

    } catch (submitError) {
      setUploading(false);
      const serverErrors = readServerErrors(submitError);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      } else {
        notifications.show(
          `Error al guardar la película:
          ${(submitError as Error).message}`,
          { severity: 'error',
            autoHideDuration: 5000, }
        );
      }
    }
  };

  const isValid = Object.keys(validateAll(values, isCreate)).length === 0;

  return {
    isCreate, loading, saving, uploading, isValid,

    values, setFieldValue,
    title: values.title,
    synopsis: values.synopsis,
    yearDate: values.yearDate,
    durationTime: values.durationTime,
    ratingId: values.ratingId,
    genreIds: values.genreIds,
    directorIds: values.directorIds,
    formatIds: values.formatIds,
    originalLangs: values.originalLangs,
    dubLangs: values.dubLangs,
    subLangs: values.subLangs,
    existingPoster: values.existingPoster,
    posterFile: values.posterFile,
    posterPreview, previewSrc,
    fieldErrors, touched, detail, catalogs,

    setDubLangs: (val: Language[]) => setFieldValue('dubLangs', val),
    setSubLangs: (val: Language[]) => setFieldValue('subLangs', val),

    handleTitleChange, handleSynopsisChange, handleBlur,
    handleYearChange, handleDurationChange, handleRatingChange,
    handleGenresChange, handleDirectorsChange, handleFormatsChange,
    handleOriginalLangsChange, handlePosterChange,
    handleSubmit,
  };
}

export type MovieForm = ReturnType<typeof useMovieForm>;
