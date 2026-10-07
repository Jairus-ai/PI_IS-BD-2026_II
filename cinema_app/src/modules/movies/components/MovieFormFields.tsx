import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { AudiovisualFormat, Director, Genre, Language, Rating } from '../types/movies';
import { firstError } from '../utils/movieFormUtils';
import RequiredFieldsHint from '../../../components/common/RequiredFieldsHint';
import type { MovieForm } from '../hooks/useMovieForm';

function FieldError({ show, message }: { show: boolean | undefined; message: string }) {
  return <>{(show && message) || ' '}</>;
}

export default function MovieFormFields({ form, formId }: { form: MovieForm; formId: string }) {
  const langError = firstError(form.fieldErrors.LANGUAGES_ORIGINAL) || firstError(form.fieldErrors.LANGUAGES);
  const err = (name: string) => form.touched[name] && Boolean((form.fieldErrors as Record<string, unknown>)[name]);

  return (
    <Box component="form" id={formId} onSubmit={form.handleSubmit} noValidate autoComplete="off">
      <Stack spacing={2}>
        <TextField
          label="TÃ­tulo"
          value={form.title}
          onChange={form.handleTitleChange}
          onBlur={form.handleBlur('MOVIE_TITLE')}
          error={err('MOVIE_TITLE')}
          helperText={<FieldError show={err('MOVIE_TITLE')} message={firstError(form.fieldErrors.MOVIE_TITLE)} />}
          fullWidth
          required
        />
        <TextField
          label="Sinopsis"
          value={form.synopsis}
          onChange={form.handleSynopsisChange}
          onBlur={form.handleBlur('SYNOPSIS')}
          error={err('SYNOPSIS')}
          helperText={<FieldError show={err('SYNOPSIS')} message={firstError(form.fieldErrors.SYNOPSIS)} />}
          multiline
          rows={3}
          fullWidth
          required
        />
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DatePicker
              label="AÃ±o de publicaciÃ³n"
              views={['year']}
              openTo="year"
              value={form.yearDate}
              onChange={form.handleYearChange}
              onClose={form.handleBlur('PUBLISHING_YEAR')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: err('PUBLISHING_YEAR'),
                  helperText: <FieldError show={err('PUBLISHING_YEAR')} message={firstError(form.fieldErrors.PUBLISHING_YEAR)} />,
                },
              }}
            />
            <TimePicker
              label="DuraciÃ³n"
              views={['hours', 'minutes']}
              format="H:mm"
              ampm={false}
              value={form.durationTime}
              onChange={form.handleDurationChange}
              onClose={form.handleBlur('MOVIE_DURATION')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                  error: err('MOVIE_DURATION'),
                  helperText: <FieldError show={err('MOVIE_DURATION')} message={firstError(form.fieldErrors.MOVIE_DURATION)} />,
                },
              }}
            />
          </Stack>
        </LocalizationProvider>
        <FormControl fullWidth required error={err('ID_RATING')}>
          <InputLabel id="movie-rating-label">ClasificaciÃ³n</InputLabel>
          <Select
            labelId="movie-rating-label"
            value={form.ratingId}
            label="ClasificaciÃ³n"
            onChange={(e) => form.handleRatingChange(e.target.value as number)}
            onBlur={form.handleBlur('ID_RATING')}
          >
            {(form.catalogs.ratings as Rating[]).map((r) => (
              <MenuItem key={r.ID_RATING} value={r.ID_RATING}>
                {r.RATING_CODE} â€” {r.RATING_NAME}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText><FieldError show={err('ID_RATING')} message={firstError(form.fieldErrors.ID_RATING)} /></FormHelperText>
        </FormControl>
        <Autocomplete
          multiple
          options={form.catalogs.genres as Genre[]}
          value={form.genreIds}
          onChange={(_, v) => form.handleGenresChange(v)}
          onBlur={form.handleBlur('GENRE_IDS')}
          getOptionLabel={(g) => g.GENRE_NAME}
          isOptionEqualToValue={(a, b) => a.ID_GENRE === b.ID_GENRE}
          renderInput={(params) => (
            <TextField
              {...params}
              label="GÃ©neros"
              required
              error={err('GENRE_IDS')}
              helperText={<FieldError show={err('GENRE_IDS')} message={firstError(form.fieldErrors.GENRE_IDS)} />}
            />
          )}
        />
        <Autocomplete
          multiple
          options={form.catalogs.directors as Director[]}
          value={form.directorIds}
          onChange={(_, v) => form.handleDirectorsChange(v)}
          onBlur={form.handleBlur('DIRECTOR_IDS')}
          getOptionLabel={(d) => `${d.DIRECTOR_FIRST_NAME} ${d.DIRECTOR_LAST_NAME}`}
          isOptionEqualToValue={(a, b) => a.ID_DIRECTOR === b.ID_DIRECTOR}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Directores"
              required
              error={err('DIRECTOR_IDS')}
              helperText={<FieldError show={err('DIRECTOR_IDS')} message={firstError(form.fieldErrors.DIRECTOR_IDS)} />}
            />
          )}
        />
        <Autocomplete
          multiple
          options={form.catalogs.formats as AudiovisualFormat[]}
          value={form.formatIds}
          onChange={(_, v) => form.handleFormatsChange(v)}
          onBlur={form.handleBlur('FORMAT_IDS')}
          getOptionLabel={(f) => `${f.VIDEO_FORMAT_NAME} ${f.AUDIO_FORMAT_NAME}`}
          isOptionEqualToValue={(a, b) => a.ID_AUDIOVISUAL_FORMAT === b.ID_AUDIOVISUAL_FORMAT}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Formatos audiovisuales"
              required
              error={err('FORMAT_IDS')}
              helperText={<FieldError show={err('FORMAT_IDS')} message={firstError(form.fieldErrors.FORMAT_IDS)} />}
            />
          )}
        />
        <Autocomplete
          multiple
          options={form.catalogs.languages as Language[]}
          value={form.originalLangs}
          onChange={(_, v) => form.handleOriginalLangsChange(v)}
          onBlur={form.handleBlur('LANGUAGES_ORIGINAL')}
          getOptionLabel={(l) => l.LANGUAGE_NAME}
          isOptionEqualToValue={(a, b) => a.ISO_CODE === b.ISO_CODE}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Idioma original"
              required
              error={form.touched.LANGUAGES_ORIGINAL && Boolean(langError)}
              helperText={(form.touched.LANGUAGES_ORIGINAL && langError) || ' '}
            />
          )}
        />
        <Autocomplete
          multiple
          options={form.catalogs.languages as Language[]}
          value={form.dubLangs}
          onChange={(_, v) => form.setDubLangs(v)}
          getOptionLabel={(l) => l.LANGUAGE_NAME}
          isOptionEqualToValue={(a, b) => a.ISO_CODE === b.ISO_CODE}
          renderInput={(params) => (
            <TextField {...params} label="Doblaje" helperText=" " />
          )}
        />
        <Autocomplete
          multiple
          options={form.catalogs.languages as Language[]}
          value={form.subLangs}
          onChange={(_, v) => form.setSubLangs(v)}
          getOptionLabel={(l) => l.LANGUAGE_NAME}
          isOptionEqualToValue={(a, b) => a.ISO_CODE === b.ISO_CODE}
          renderInput={(params) => (
            <TextField {...params} label="Subtitulado" helperText=" " />
          )}
        />
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.dark' }}>
            PÃ³ster
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'flex-start', mt: 1 }}>
            <Button variant="outlined" component="label">
              Seleccionar imagen
              <input
                type="file"
                hidden
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(e) => form.handlePosterChange(e.target.files?.[0] ?? null)}
              />
            </Button>
            {form.previewSrc ? (
              <Box
                component="img"
                src={form.previewSrc}
                alt="PÃ³ster de la pelÃ­cula"
                sx={{ width: 120, borderRadius: 1, objectFit: 'cover' }}
              />
            ) : (
              <Typography variant="body2" color={form.touched.POSTER && form.fieldErrors.POSTER ? 'error' : 'text.secondary'}>
                {form.touched.POSTER && firstError(form.fieldErrors.POSTER) ? firstError(form.fieldErrors.POSTER) : 'Sin imagen seleccionada'}
              </Typography>
            )}
          </Stack>
        </Box>
        <RequiredFieldsHint />
        {form.saving ? (
          <Alert severity="info">{form.isCreate ? 'Subiendo pÃ³ster y creando pelÃ­culaâ€¦' : 'Subiendo pÃ³ster y actualizando pelÃ­culaâ€¦'}</Alert>
        ) : null}
      </Stack>
    </Box>
  );
}
