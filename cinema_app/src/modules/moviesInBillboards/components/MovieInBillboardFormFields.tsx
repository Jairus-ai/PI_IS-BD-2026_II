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
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import type { MovieInBillboardForm } from '../hooks/useMovieInBillboardForm';
import type { LocationOption } from '../types/moviesInBillboards';
import type { MovieOption } from '../../movies/types/movies';
import { toPickerDate } from '../utils/movieInBillboardFormUtils';

const DISPLAY_DATE_FORMAT = 'DD/MM/YYYY';
const DATE_PICKER_TEXT = esES.components.MuiLocalizationProvider.defaultProps.localeText;

const LOAD_ERROR_MESSAGE = 'No se pudo cargar la película en cartelera.';
const OPTIONS_ERROR_MESSAGE = 'No se pudieron cargar las películas o las sucursales.';
const NO_OPTIONS_MESSAGE = 'Deben existir películas y sucursales registradas para poder agregar una película a la cartelera.';

interface MovieInBillboardFormFieldsProps {
  readonly form: MovieInBillboardForm;
  readonly formId: string;
}

export default function MovieInBillboardFormFields({
  form,
  formId
}: MovieInBillboardFormFieldsProps) {
  const {
    values,
    errors,
    movies,
    locations,
    selectedMovie,
    hasNoOptions,
    optionsError,
    movieInBillboardError
  } = form;

  if (movieInBillboardError) {
    return (
      <Alert
        severity="error"
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => void form.refetchMovieInBillboard()}
          >
            Reintentar
          </Button>
        }
      >
        {LOAD_ERROR_MESSAGE}
      </Alert>
    );
  }

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale="es"
      localeText={DATE_PICKER_TEXT}
    >
      <Stack
        component="form"
        id={formId}
        noValidate
        onSubmit={form.handleSubmit}
        spacing={2}
      >
        <RequiredFieldsHint />
        {hasNoOptions && <Alert severity="warning">{NO_OPTIONS_MESSAGE}</Alert>}
        {optionsError && <Alert severity="error">{OPTIONS_ERROR_MESSAGE}</Alert>}

        <Autocomplete
          options={movies}
          value={selectedMovie}
          onChange={(_event, movie: MovieOption | null) => form.handleMovieChange(movie)}
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
          onChange={form.handleLocationChange}
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
            onChange={form.handleOpeningDateChange}
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
            onChange={form.handleClosingDateChange}
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
              onChange={form.handlePremierChange}
              disabled={hasNoOptions}
            />
          }
        />
      </Stack>
    </LocalizationProvider>
  );
}
