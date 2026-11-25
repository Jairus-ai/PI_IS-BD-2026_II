import { useState } from 'react';
import { Link } from 'react-router';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import { useNowShowingMovies } from '../hooks/useBillboardMovies';
import { getPosterUrl, type NowShowingMovie } from '../types/billboard';

const TITLE = 'Cartelera';
const LOADING_MESSAGE = 'Cargando cartelera...';
const ERROR_MESSAGE = 'No se pudo cargar la cartelera';
const EMPTY_MESSAGE = 'No hay películas en cartelera por el momento. Vuelve pronto para ver los próximos estrenos.';
const IMAGE_NOT_AVAILABLE = 'Imagen no disponible';
const NO_GENRE = 'Sin género';
const GRID_COLUMNS = {
  xs: 'repeat(2, minmax(0, 1fr))',
  sm: 'repeat(3, minmax(0, 1fr))',
  md: 'repeat(4, minmax(0, 1fr))',
  lg: 'repeat(5, minmax(0, 1fr))'
};

function formatDuration(minutes: number): string {
  return `${minutes} min`;
}

function PosterPlaceholder() {
  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.5,
        bgcolor: 'grey.800',
        color: 'grey.400'
      }}
    >
      <ImageNotSupportedOutlinedIcon sx={{ fontSize: 56 }} />
      <Typography variant="caption">{IMAGE_NOT_AVAILABLE}</Typography>
    </Box>
  );
}

interface MovieCardProps {
  readonly movie: NowShowingMovie;
}

function MovieCard({ movie }: MovieCardProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const posterUrl = getPosterUrl(movie.POSTER);
  const showPoster = posterUrl !== null && !hasImageError;
  const genres = movie.GENRES ?? NO_GENRE;
  const duration = formatDuration(movie.MOVIE_DURATION);

  return (
    <Box
      component={Link}
      to={`/movies/${movie.ID_MOVIE}`}
      aria-label={`Ver detalle de ${movie.MOVIE_TITLE}`}
      className="card"
      sx={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '2 / 3', textDecoration: 'none' }}
    >
      <Box className="content" sx={{ position: 'relative' }}>
        <Box className="front">
          {showPoster ? (
            <img
              className="poster-img"
              src={posterUrl}
              alt={movie.MOVIE_TITLE}
              onError={() => setHasImageError(true)}
            />
          ) : (
            <PosterPlaceholder />
          )}
          <Box className="front-content">
            <span className="badge">{movie.RATING_CODE}</span>
            <Box className="description">
              <p className="movie-title-front">{movie.MOVIE_TITLE}</p>
              <p className="card-footer">{genres} · {duration}</p>
            </Box>
          </Box>
        </Box>

        <Box className="back" aria-hidden>
          <Box className="back-content">
            <h4>{movie.MOVIE_TITLE}</h4>
            <p><strong>Clasificación:</strong> {movie.RATING_CODE}</p>
            <p><strong>Duración:</strong> {duration}</p>
            <p><strong>Género:</strong> {genres}</p>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function BillboardGrid() {
  const { movies, isLoadingMovies, moviesError, refetchMovies } = useNowShowingMovies();

  const renderContent = () => {
    if (isLoadingMovies) {
      return (
        <Box role="status" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: 6 }}>
          <CircularProgress size={32} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {LOADING_MESSAGE}
          </Typography>
        </Box>
      );
    }

    if (moviesError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchMovies()}>
              Reintentar
            </Button>
          }
        >
          {ERROR_MESSAGE}
        </Alert>
      );
    }

    if (movies.length === 0) {
      return <Alert severity="info">{EMPTY_MESSAGE}</Alert>;
    }

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: { xs: 2, md: 3 } }}>
        {movies.map((movie: NowShowingMovie) => (
          <MovieCard key={movie.ID_MOVIE} movie={movie} />
        ))}
      </Box>
    );
  };

  return (
    <Box component="section" aria-labelledby="billboard-title" sx={{ px: { xs: 1, md: 8 }, py: 3 }}>
      <Typography
        id="billboard-title"
        component="h2"
        sx={{ color: 'primary.dark', fontWeight: 700, fontSize: { xs: 28, md: 34 }, mb: 2 }}
      >
        {TITLE}
      </Typography>
      {renderContent()}
    </Box>
  );
}
