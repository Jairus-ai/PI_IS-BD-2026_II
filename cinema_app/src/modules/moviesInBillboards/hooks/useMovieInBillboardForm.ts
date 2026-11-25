import {
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent
} from 'react';
import type { Dayjs } from 'dayjs';
import useNotifications from '../../../hooks/useNotifications';
import {
  useCreateMovieInBillboard,
  useMovieInBillboard,
  useMovieInBillboardFormOptions,
  useUpdateMovieInBillboard
} from './useMoviesInBillboards';
import type { MovieOption } from '../../movies/types/movies';
import {
  EMPTY_FORM_VALUES,
  validateMovieInBillboardForm,
  type MovieInBillboardFormErrors,
  type MovieInBillboardFormValues
} from '../utils/movieInBillboardFormValidation';
import { mapDetailToFormValues } from '../utils/movieInBillboardFormHydration';
import { buildMovieInBillboardPayload } from '../utils/movieInBillboardPayloadBuilder';
import {
  readServerMessage,
  toApiDate
} from '../utils/movieInBillboardFormUtils';

const CREATE_SUCCESS_MESSAGE = 'Película agregada a la cartelera';
const CREATE_ERROR_MESSAGE = 'No se pudo agregar la película a la cartelera. Intenta de nuevo.';
const UPDATE_SUCCESS_MESSAGE = 'Película en cartelera actualizada';
const UPDATE_ERROR_MESSAGE = 'No se pudo modificar la película en cartelera. Intenta de nuevo.';

export interface UseMovieInBillboardFormArgs {
  movieInBillboardId: number | null;
  open: boolean;
  onClose: () => void;
}

export function useMovieInBillboardForm({
  movieInBillboardId,
  open,
  onClose
}: UseMovieInBillboardFormArgs) {
  const isCreate = movieInBillboardId === null;

  const notifications = useNotifications();

  const {
    movies,
    locations,
    isLoadingOptions,
    optionsError
  } = useMovieInBillboardFormOptions(open);

  const {
    movieInBillboard,
    movieInBillboardError,
    refetchMovieInBillboard
  } = useMovieInBillboard(movieInBillboardId);

  const {
    createMovieInBillboard,
    isCreatingMovieInBillboard
  } = useCreateMovieInBillboard();

  const {
    updateMovieInBillboard,
    isUpdatingMovieInBillboard
  } = useUpdateMovieInBillboard();

  const [values, setValues] = useState<MovieInBillboardFormValues>(EMPTY_FORM_VALUES);
  const [errors, setErrors] = useState<MovieInBillboardFormErrors>({});
  const [hydratedId, setHydratedId] = useState<number | null>(null);
  const isSubmittingRef = useRef(false);

  if (movieInBillboard && hydratedId !== movieInBillboard.ID_MOVIE_IN_BILLBOARD) {
    setHydratedId(movieInBillboard.ID_MOVIE_IN_BILLBOARD);
    setValues(mapDetailToFormValues(movieInBillboard));
  }

  const isWaitingForDetail = !isCreate && !movieInBillboard && !movieInBillboardError;
  const loading = isLoadingOptions || isWaitingForDetail;
  const saving = isCreatingMovieInBillboard || isUpdatingMovieInBillboard;
  const hasNoOptions = !isLoadingOptions
    && !optionsError
    && (movies.length === 0 || locations.length === 0);
  const canSubmit = !hasNoOptions
    && !optionsError
    && !movieInBillboardError
    && !saving;
  const selectedMovie = movies.find((movie) => movie.ID_MOVIE === values.movieId) ?? null;

  const setFieldValue = <K extends keyof MovieInBillboardFormValues>(
    field: K,
    value: MovieInBillboardFormValues[K]
  ) => {
    setValues((previousValues) => ({
      ...previousValues,
      [field]: value
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      [field]: undefined
    }));
  };

  const handleMovieChange = (movie: MovieOption | null) => {
    setFieldValue('movieId', movie?.ID_MOVIE ?? null);
  };

  const handleLocationChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFieldValue('locationId', Number(event.target.value));
  };

  const handleOpeningDateChange = (date: Dayjs | null) => {
    setFieldValue('openingDate', toApiDate(date));
  };

  const handleClosingDateChange = (date: Dayjs | null) => {
    setFieldValue('closingDate', toApiDate(date));
  };

  const handlePremierChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFieldValue('premier', event.target.checked);
  };

  const saveMovieInBillboard = async () => {
    const payload = buildMovieInBillboardPayload(values);

    if (isCreate) {
      await createMovieInBillboard(payload);
      notifications.show(CREATE_SUCCESS_MESSAGE, {
        severity: 'success',
        autoHideDuration: 3000
      });
      return;
    }

    await updateMovieInBillboard({
      id: movieInBillboardId,
      movieInBillboard: payload
    });
    notifications.show(UPDATE_SUCCESS_MESSAGE, {
      severity: 'success',
      autoHideDuration: 3000
    });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current || !canSubmit)
      return;

    const formErrors = validateMovieInBillboardForm(values);

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0)
      return;

    isSubmittingRef.current = true;

    try {
      await saveMovieInBillboard();
      onClose();

    } catch (error) {
      const fallbackMessage = isCreate
        ? CREATE_ERROR_MESSAGE
        : UPDATE_ERROR_MESSAGE;

      notifications.show(readServerMessage(error, fallbackMessage), {
        severity: 'error',
        autoHideDuration: 5000
      });

    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = () => {
    if (saving)
      return;

    onClose();
  };

  return {
    isCreate,
    loading,
    saving,
    canSubmit,
    values,
    errors,
    movies,
    locations,
    selectedMovie,
    hasNoOptions,
    optionsError,
    movieInBillboardError,
    refetchMovieInBillboard,
    handleMovieChange,
    handleLocationChange,
    handleOpeningDateChange,
    handleClosingDateChange,
    handlePremierChange,
    handleSubmit,
    handleClose
  };
}

export type MovieInBillboardForm = ReturnType<typeof useMovieInBillboardForm>;
