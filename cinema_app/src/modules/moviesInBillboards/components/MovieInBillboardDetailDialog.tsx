import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { DetailField } from '../../../components/crud/DetailField';
import { getPosterUrl } from '../../billboard/types/billboard';
import { useMovieInBillboard } from '../hooks/useMoviesInBillboards';
import { formatBillboardDate } from '../types/moviesInBillboards';
import { formatDuration } from '../../movies/types/movies';

const DEFAULT_TITLE = 'Película en cartelera';
const LOAD_ERROR_MESSAGE = 'No se pudo cargar el detalle de la película en cartelera.';

interface MovieInBillboardDetailDialogProps {
  readonly movieInBillboardId: number | null;
  readonly onClose: () => void;
}

export default function MovieInBillboardDetailDialog({
  movieInBillboardId,
  onClose
}: MovieInBillboardDetailDialogProps) {
  const [displayedId, setDisplayedId] = useState<number | null>(movieInBillboardId);

  if (movieInBillboardId !== null && movieInBillboardId !== displayedId)
    setDisplayedId(movieInBillboardId);

  const {
    movieInBillboard,
    isLoadingMovieInBillboard,
    movieInBillboardError,
    refetchMovieInBillboard
  } = useMovieInBillboard(displayedId);

  const posterUrl = movieInBillboard
    ? getPosterUrl(movieInBillboard.POSTER)
    : null;

  return (
    <CrudDialog
      open={movieInBillboardId !== null}
      title={movieInBillboard?.MOVIE_TITLE ?? DEFAULT_TITLE}
      onClose={onClose}
      loading={isLoadingMovieInBillboard}
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {movieInBillboardError && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => void refetchMovieInBillboard()}
            >
              Reintentar
            </Button>
          }
        >
          {LOAD_ERROR_MESSAGE}
        </Alert>
      )}

      {movieInBillboard && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
        >
          <Box sx={{ width: { sm: 240 }, flexShrink: 0 }}>
            {posterUrl ? (
              <Box
                component="img"
                src={posterUrl}
                alt={movieInBillboard.MOVIE_TITLE}
                sx={{
                  width: '100%',
                  borderRadius: 1,
                  objectFit: 'cover'
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
                  justifyContent: 'center'
                }}
              >
                <Typography color="text.secondary">Sin póster</Typography>
              </Box>
            )}
          </Box>

          <Stack
            spacing={1.5}
            sx={{ flex: 1 }}
          >
            <DetailField
              label="Sucursal"
              value={movieInBillboard.LOCATION_NAME}
            />
            <DetailField
              label="Fecha de inicio en cartelera"
              value={formatBillboardDate(movieInBillboard.OPENING_DATE)}
            />
            <DetailField
              label="Fecha de fin en cartelera"
              value={formatBillboardDate(movieInBillboard.CLOSING_DATE)}
            />
            <DetailField
              label="Clasificación"
              value={`${movieInBillboard.RATING_CODE} - ${movieInBillboard.RATING_NAME}`}
            />
            <DetailField
              label="Duración (hh:mm)"
              value={formatDuration(movieInBillboard.MOVIE_DURATION)}
            />
          </Stack>
        </Stack>
      )}
    </CrudDialog>
  );
}
