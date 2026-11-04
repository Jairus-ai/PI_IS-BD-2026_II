import * as React from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useMovies } from '../hooks/useMovies';
import { API_BASE_URL } from '../../../services/api';
import type { MovieDetail } from '../types/movies';
import { DetailField } from '../../../components/crud/DetailField';
import { CrudDialog } from '../../../components/crud/CrudDialog';

function formatDuration(totalMinutes: number | null | undefined): string {
  if (totalMinutes == null) return '00:00';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const minsStr = String(mins).padStart(2, '0');
  if (hours <= 0) return `00:${minsStr}`;
  if (mins === 0) return `${hours}:00`;
  return `${hours}:${minsStr}`;
}

function posterSrc(poster: string | null): string | undefined {
  if (!poster) return undefined;
  if (poster.startsWith('http')) return poster;
  return `${API_BASE_URL}${poster}`;
}

export default function MovieDetailDialog({
  movieId,
  open,
  onClose,
}: {
  readonly movieId: number | null;
  readonly open: boolean;
  readonly onClose: () => void;
}) {
  const { movieDetail, isLoadingDetail } = useMovies(1, movieId as any);
  const movie = movieDetail as MovieDetail | null;
  const title = movie?.MOVIE_TITLE ?? (isLoadingDetail ? 'Cargando…' : 'Película');

  return (
    <CrudDialog
      open={open}
      title={title}
      onClose={onClose}
      loading={isLoadingDetail}
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {!movie && movieId != null && (
        <Alert severity="warning">Sin datos.</Alert>
      )}

      {movie && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Box sx={{ width: { sm: 240 }, flexShrink: 0 }}>
            {posterSrc(movie.POSTER) ? (
              <Box
                component="img"
                src={posterSrc(movie.POSTER)}
                alt={movie.MOVIE_TITLE}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: 320,
                  bgcolor: 'background.default',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">Sin póster</Typography>
              </Box>
            )}
          </Box>

          <Stack spacing={1.5} sx={{ flex: 1 }}>
            <DetailField
              label="Clasificación"
              value={movie.RATING_CODE}
            />
            <DetailField
              label="Duración"
              value={formatDuration(movie.MOVIE_DURATION)}
            />
            <DetailField
              label="Sinopsis"
              value={movie.SYNOPSIS}
            />
            <DetailField
              label="Géneros"
              list={movie.GENRES}
            />
            <DetailField
              label="Directores"
              list={movie.DIRECTORS}
            />
            <DetailField
              label="Formatos"
              list={movie.FORMATS}
            />
            <DetailField
              label="Idiomas"
              list={movie.LANGUAGES}
            />
          </Stack>
        </Stack>
      )}
    </CrudDialog>
  );
}