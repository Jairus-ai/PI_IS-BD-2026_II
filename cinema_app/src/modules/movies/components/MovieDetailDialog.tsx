import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useMovies } from '../hooks/useMovies';
import { API_BASE_URL } from '../../../services/api';
import type { MovieDetail } from '../types/movies';

function splitList(s: string | null): string[] {
  if (!s) return [];
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

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

export default function MovieDetailDialog({ movieId, open, onClose }: {
  movieId: number | null; open: boolean; onClose: () => void;
}) {
  const { movieDetail, isLoadingDetail } = useMovies(1, movieId as any);
  const movie = movieDetail as MovieDetail | null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{movie?.MOVIE_TITLE ?? (isLoadingDetail ? 'Cargando…' : 'Película')}</DialogTitle>
      <DialogContent dividers>
        {isLoadingDetail ? <Box sx={{display:'flex',justifyContent:'center',p:4}}><CircularProgress/></Box>
        : !movie ? (movieId != null ? <Alert severity="warning">Sin datos.</Alert> : null)
        : (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ width: { sm: 240 }, flexShrink: 0 }}>
              {posterSrc(movie.POSTER)
                ? <Box component="img" src={posterSrc(movie.POSTER)} alt={movie.MOVIE_TITLE}
                       sx={{ width: '100%', borderRadius: 1, objectFit: 'cover' }} />
                : <Box sx={{ width:'100%', height: 320, bgcolor:'grey.200', borderRadius:1,
                             display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Typography color="text.secondary">Sin póster</Typography>
                  </Box>}
            </Box>
            <Stack spacing={1.5} sx={{ flex: 1 }}>
              <Box><Typography variant="overline">Clasificación</Typography>
                <Typography variant="body1">{movie.RATING_CODE ? `${movie.RATING_CODE} — ${movie.RATING_NAME}` : (movie.RATING_NAME ?? '—')}</Typography></Box>
              <Box><Typography variant="overline">Año de publicación</Typography>
                <Typography variant="body1">{movie.PUBLISHING_YEAR}</Typography></Box>
              <Box><Typography variant="overline">Duración</Typography>
                <Typography variant="body1">{formatDuration(movie.MOVIE_DURATION)}</Typography></Box>
              <Box><Typography variant="overline">Sinopsis</Typography>
                <Typography variant="body1">{movie.SYNOPSIS}</Typography></Box>
              <Box><Typography variant="overline">Géneros</Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {splitList(movie.GENRES).map(g => <Chip key={g} label={g} />)}
                </Stack></Box>
              <Box><Typography variant="overline">Directores</Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {splitList(movie.DIRECTORS).map(d => <Chip key={d} label={d} variant="outlined" />)}
                </Stack></Box>
              <Box><Typography variant="overline">Formatos</Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {splitList(movie.FORMATS).map(f => <Chip key={f} label={f} variant="outlined" />)}
                </Stack></Box>
              <Box><Typography variant="overline">Idiomas</Typography>
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {splitList(movie.LANGUAGES).map(l => <Chip key={l} label={l} />)}
                </Stack></Box>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cerrar</Button></DialogActions>
    </Dialog>
  );
}