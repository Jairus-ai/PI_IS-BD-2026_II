import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import Grid from '@mui/material/Grid';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent, SelectProps } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate } from 'react-router';
import dayjs, { Dayjs } from 'dayjs';
import type { Movie, Genre, Rating, Language, AudiovisualFormat } from '../types/movies';

export interface MovieFormState {
  values: Partial<Omit<Movie, 'id'>>;
  errors: Partial<Record<keyof MovieFormState['values'], string>>;
}

export type FormFieldValue = string | string[] | number | boolean | File | null;

export interface MovieFormProps {
  formState: MovieFormState;
  onFieldChange: (
    name: keyof MovieFormState['values'],
    value: FormFieldValue,
  ) => void;
  onSubmit: (formValues: Partial<MovieFormState['values']>) => Promise<void>;
  onReset?: (formValues: Partial<MovieFormState['values']>) => void;
  submitButtonLabel: string;
  backButtonPath?: string;

  ratings?: Rating[];
  genres?: Genre[];
  languages?: Language[];
  formats?: AudiovisualFormat[];
}

export default function MovieForm(props: MovieFormProps) {
const {
    formState,
    onFieldChange,
    onSubmit,
    onReset,
    submitButtonLabel,
    backButtonPath,
    ratings = [],
    genres = [],
    languages = [],
    formats = [],
  } = props;

  const formValues = formState.values;
  const formErrors = formState.errors;

  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      try {
        await onSubmit(formValues);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formValues, onSubmit],
  );

  const handleTextFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof MovieFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleNumberFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(
        event.target.name as keyof MovieFormState['values'],
        Number(event.target.value),
      );
    },
    [onFieldChange],
  );

  const handleCheckboxFieldChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      onFieldChange(event.target.name as keyof MovieFormState['values'], checked);
    },
    [onFieldChange],
  );

  const handleDateFieldChange = React.useCallback(
    (fieldName: keyof MovieFormState['values']) => (value: Dayjs | null) => {
      if (value?.isValid()) {
        onFieldChange(fieldName, value.toISOString() ?? null);
      } else if (formValues[fieldName]) {
        onFieldChange(fieldName, null);
      }
    },
    [formValues, onFieldChange],
  );

  const handleSelectFieldChange = React.useCallback(
    (event: SelectChangeEvent) => {
      onFieldChange(
        event.target.name as keyof MovieFormState['values'],
        event.target.value,
      );
    },
    [onFieldChange],
  );

  const handleBack = React.useCallback(() => {
    navigate(backButtonPath ?? '/movies');
  }, [navigate, backButtonPath]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      sx={{ width: '100%' }}
    >
      <FormGroup>
        <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              value={formValues.MOVIE_TITLE ?? ''}
              onChange={handleTextFieldChange}
              name="MOVIE_TITLE"
              label="Título de la película"
              error={!!formErrors.MOVIE_TITLE}
              helperText={formErrors.MOVIE_TITLE ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              type="number"
              value={formValues.PUBLISHING_YEAR ?? ''}
              onChange={handleNumberFieldChange}
              name="PUBLISHING_YEAR"
              label="Año de Publicación"
              error={!!formErrors.PUBLISHING_YEAR}
              helperText={formErrors.PUBLISHING_YEAR ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <TextField
              type="number"
              value={formValues.MOVIE_DURATION ?? ''}
              onChange={handleNumberFieldChange}
              name="MOVIE_DURATION"
              label="Duración de la película"
              error={!!formErrors.MOVIE_DURATION}
              helperText={formErrors.MOVIE_DURATION ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              name="POSTER"
              label="URL del Póster"
              value={formValues.POSTER ?? ''}
              onChange={handleTextFieldChange}
              error={!!formErrors.POSTER}
              helperText={formErrors.POSTER ?? ' '}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              name="SYNOPSIS"
              label="Sinopsis"
              value={formValues.SYNOPSIS ?? ''}
              onChange={handleTextFieldChange}
              error={!!formErrors.SYNOPSIS}
              helperText={formErrors.SYNOPSIS ?? ' '}
              multiline
              rows={4}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl error={!!formErrors.ID_RATING} fullWidth>
              <InputLabel id="rating-select-label">Clasificación</InputLabel>
              <Select
                labelId="rating-select-label"
                name="ID_RATING"
                value={formValues.ID_RATING ? String(formValues.ID_RATING) : ''}
                onChange={handleSelectFieldChange}
                label="Clasificación"
              >
                {ratings.map((rating) => (
                  <MenuItem key={rating.ID_RATING} value={rating.ID_RATING}>
                    {rating.RATING_CODE} - {rating.RATING_NAME}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{formErrors.ID_RATING ?? ' '}</FormHelperText>
            </FormControl>
          </Grid>
          {/* <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={formValues.joinDate ? dayjs(formValues.joinDate) : null}
                onChange={handleDateFieldChange('joinDate')}
                name="MOVIE_DURATION"
                label="Join date"
                slotProps={{
                  textField: {
                    error: !!formErrors.joinDate,
                    helperText: formErrors.joinDate ?? ' ',
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
          </Grid> */}
          {/* <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <FormControl error={!!formErrors.role} fullWidth>
              <InputLabel id="employee-role-label">Department</InputLabel>
              <Select
                value={formValues.role ?? ''}
                onChange={handleSelectFieldChange as SelectProps['onChange']}
                labelId="employee-role-label"
                name="role"
                label="Department"
                defaultValue=""
                fullWidth
              >
                <MenuItem value="Market">Market</MenuItem>
                <MenuItem value="Finance">Finance</MenuItem>
                <MenuItem value="Development">Development</MenuItem>
              </Select>
              <FormHelperText>{formErrors.role ?? ' '}</FormHelperText>
            </FormControl>
          </Grid> */}
          {/* <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex' }}>
            <FormControl>
              <FormControlLabel
                name="isFullTime"
                control={
                  <Checkbox
                    size="large"
                    checked={formValues.isFullTime ?? false}
                    onChange={handleCheckboxFieldChange}
                  />
                }
                label="Full-time"
              />
              <FormHelperText error={!!formErrors.isFullTime}>
                {formErrors.isFullTime ?? ' '}
              </FormHelperText>
            </FormControl>
          </Grid> */}
        </Grid>
      </FormGroup>
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
        >
          Volver
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
        >
          {submitButtonLabel}
        </Button>
      </Stack>
    </Box>
  );
}
