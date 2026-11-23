import {
  useRef,
  useState,
  type ChangeEvent,
  type SubmitEvent
} from 'react';
import { isAxiosError } from 'axios';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { esES } from '@mui/x-date-pickers/locales';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import useNotifications from '../../../hooks/useNotifications';
import { useDialogs } from '../../../hooks/useDialogs';
import {
  useCreateMovieInBillboard,
  useMovieInBillboardFormOptions
} from '../hooks/useMoviesInBillboards';
import { getMovieInBillboardFormErrors } from '../validators/movieInBillboardValidator';
import type { LocationOption } from '../types/moviesInBillboards';
import type { MovieOption } from '../../movies/types/movies';

const FORM_ID = 'movie-in-billboard-form';
const API_DATE_FORMAT = 'YYYY-MM-DD';
const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';
const DATE_PICKER_TEXT = esES.components.MuiLocalizationProvider.defaultProps.localeText;

const SUCCESS_MESSAGE = 'Película agregada a la cartelera';
const SAVE_ERROR_MESSAGE = 'No se pudo agregar la película a la cartelera. Intenta de nuevo.';
const OPTIONS_ERROR_MESSAGE = 'No se pudieron cargar las películas o las sucursales.';
const NO_OPTIONS_MESSAGE = 'Deben existir películas y sucursales registradas para poder agregar una película a la cartelera.';

interface MovieInBillboardFormValues {
  movieId: number | null;
  locationId: number | '';
  openingDate: string;
  closingDate: string;
  premier: boolean;
}

type MovieInBillboardFormErrors = Partial<Record<keyof MovieInBillboardFormValues, string>>;

interface MovieInBillboardErrorResponse {
  message?: string;
}

const EMPTY_VALUES: MovieInBillboardFormValues = {
  movieId: null,
  locationId: '',
  openingDate: '',
  closingDate: '',
  premier: false
};

function hasChanges(values: MovieInBillboardFormValues): boolean {
  return (Object.keys(EMPTY_VALUES) as (keyof MovieInBillboardFormValues)[])
    .some((key) => values[key] !== EMPTY_VALUES[key]);
}

function toApiDate(value: Dayjs | null): string {
  return value?.isValid()
    ? value.format(API_DATE_FORMAT)
    : '';
}

function toPickerDate(value: string): Dayjs | null {
  return value
    ? dayjs(value)
    : null;
}

interface MovieInBillboardFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export default function MovieInBillboardFormDialog({ open, onClose }: MovieInBillboardFormDialogProps) {
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const {
    movies,
    locations,
    isLoadingOptions,
    optionsError
  } = useMovieInBillboardFormOptions(open);

  const {
    createMovieInBillboard,
    isCreatingMovieInBillboard
  } = useCreateMovieInBillboard();

  const [values, setValues] = useState<MovieInBillboardFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<MovieInBillboardFormErrors>({});
  const isSubmittingRef = useRef(false);

  const hasNoOptions = !isLoadingOptions
    && !optionsError
    && (movies.length === 0 || locations.length === 0);
  const canSubmit = !hasNoOptions && !optionsError && !isCreatingMovieInBillboard;
  const selectedMovie = movies.find((movie) => movie.ID_MOVIE === values.movieId) ?? null;

  const setField = <K extends keyof MovieInBillboardFormValues>(name: K, value: MovieInBillboardFormValues[K]) => {
    setValues((previousValues) => ({
      ...previousValues,
      [name]: value
    }));
    setErrors((previousErrors) => ({
      ...previousErrors,
      [name]: undefined
    }));
  };

  const handleSaveError = (error: unknown) => {
    const message = isAxiosError<MovieInBillboardErrorResponse>(error) && error.response?.data?.message
      ? error.response.data.message
      : SAVE_ERROR_MESSAGE;

    notifications.show(message, {
      severity: 'error',
      autoHideDuration: 5000
    });
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current || !canSubmit)
      return;

    const formErrors = getMovieInBillboardFormErrors(values);

    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0)
      return;

    isSubmittingRef.current = true;

    try {
      await createMovieInBillboard({
        movieId: Number(values.movieId),
        locationId: Number(values.locationId),
        openingDate: values.openingDate,
        closingDate: values.closingDate,
        premier: values.premier
      });
      notifications.show(SUCCESS_MESSAGE, {
        severity: 'success',
        autoHideDuration: 3000
      });
      onClose();

    } catch (error) {
      handleSaveError(error);

    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleClose = async () => {
    if (isCreatingMovieInBillboard)
      return;

    if (hasChanges(values)) {
      const confirmed = await dialogs.confirm('Tienes cambios sin guardar. ¿Deseas descartarlos?', {
        title: 'Descartar cambios',
        okText: 'Descartar',
        cancelText: 'Seguir editando'
      });

      if (!confirmed)
        return;
    }

    onClose();
  };

  return (
    <CrudDialog
      open={open}
      title="Agregar película a cartelera"
      onClose={() => void handleClose()}
      loading={isLoadingOptions}
      actions={
        <>
          <Button onClick={() => void handleClose()}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="contained"
            disabled={!canSubmit}
          >
            {
              isCreatingMovieInBillboard
                ? 'Agregando…'
                : 'Agregar'
            }
          </Button>
        </>
      }
    >
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale="es"
        localeText={DATE_PICKER_TEXT}
      >
        <Stack
          component="form"
          id={FORM_ID}
          noValidate
          onSubmit={handleSubmit}
          spacing={2}
        >
          <RequiredFieldsHint />
          {hasNoOptions && <Alert severity="warning">{NO_OPTIONS_MESSAGE}</Alert>}
          {optionsError && <Alert severity="error">{OPTIONS_ERROR_MESSAGE}</Alert>}

          <Autocomplete
            options={movies}
            value={selectedMovie}
            onChange={(_event, movie: MovieOption | null) => setField('movieId', movie?.ID_MOVIE ?? null)}
            getOptionLabel={(movie: MovieOption) => movie.MOVIE_TITLE}
            isOptionEqualToValue={(option, value) => option.ID_MOVIE === value.ID_MOVIE}
            noOptionsText="No hay películas"
            disabled={hasNoOptions}
            renderInput={(params) => (
              <TextField
                {...params}
                required
                label="Película"
                error={Boolean(errors.movieId)}
                helperText={errors.movieId ?? ' '}
              />
            )}
          />

          <TextField
            select
            required
            label="Sucursal"
            value={values.locationId}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setField('locationId', Number(event.target.value))}
            error={Boolean(errors.locationId)}
            helperText={errors.locationId ?? ' '}
            disabled={hasNoOptions}
          >
            {locations.map((location: LocationOption) => (
              <MenuItem
                key={location.ID_LOCATION}
                value={location.ID_LOCATION}
              >
                {location.LOCATION_NAME}
              </MenuItem>
            ))}
          </TextField>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
          >
            <DatePicker
              label="Fecha de inicio"
              format={DISPLAY_DATE_FORMAT}
              value={toPickerDate(values.openingDate)}
              onChange={(value) => setField('openingDate', toApiDate(value))}
              disabled={hasNoOptions}
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  error: Boolean(errors.openingDate),
                  helperText: errors.openingDate ?? ' '
                }
              }}
            />
            <DatePicker
              label="Fecha de fin"
              format={DISPLAY_DATE_FORMAT}
              value={toPickerDate(values.closingDate)}
              onChange={(value) => setField('closingDate', toApiDate(value))}
              minDate={toPickerDate(values.openingDate) ?? undefined}
              disabled={hasNoOptions}
              slotProps={{
                textField: {
                  required: true,
                  fullWidth: true,
                  error: Boolean(errors.closingDate),
                  helperText: errors.closingDate ?? ' '
                }
              }}
            />
          </Stack>

          <FormControlLabel
            label="Estreno"
            control={
              <Checkbox
                checked={values.premier}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setField('premier', event.target.checked)}
                disabled={hasNoOptions}
              />
            }
          />
        </Stack>
      </LocalizationProvider>
    </CrudDialog>
  );
}
