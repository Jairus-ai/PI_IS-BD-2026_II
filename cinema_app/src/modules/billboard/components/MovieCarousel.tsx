import { useEffect, useState, type ReactNode } from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import { useBillboardMovies } from '../hooks/useBillboardMovies';
import { getPosterUrl, type BillboardMovie } from '../types/billboard';

const AUTOPLAY_INTERVAL_MS = 5000;
const CAROUSEL_HEIGHT = { xs: 260, md: 400 };
const LOADING_MESSAGE = 'Cargando películas...';
const EMPTY_TITLE = 'No hay películas en cartelera por el momento';
const EMPTY_DESCRIPTION = 'Vuelve pronto para ver los próximos estrenos.';
const ERROR_TITLE = 'No se pudieron cargar las películas';
const ERROR_DESCRIPTION = 'Ocurrió un problema al obtener la cartelera. Intenta de nuevo más tarde.';
const IMAGE_NOT_AVAILABLE = 'Imagen no disponible';

const FRAME_SX = {
  position: 'relative',
  width: '100%',
  height: CAROUSEL_HEIGHT,
  borderRadius: '10px',
  overflow: 'hidden'
};
const ARROW_SX = {
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  bgcolor: 'rgba(255, 255, 255, 0.85)',
  color: 'text.primary',
  '&:hover': { bgcolor: 'common.white' }
};

interface StateFrameProps {
  readonly children: ReactNode;
  readonly isError?: boolean;
}

function StateFrame({ children, isError = false }: StateFrameProps) {
  return (
    <Box
      role={isError ? 'alert' : 'status'}
      sx={{
        ...FRAME_SX,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        px: 2,
        textAlign: 'center',
        bgcolor: (theme) => (isError ? alpha(theme.palette.error.main, 0.08) : theme.palette.grey[100])
      }}
    >
      {children}
    </Box>
  );
}

interface ImagePlaceholderProps {
  readonly showCaption?: boolean;
}
function ImagePlaceholder({ showCaption = true }: ImagePlaceholderProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, color: 'grey.400' }}>
      <ImageNotSupportedOutlinedIcon sx={{ fontSize: 56 }} />
      {showCaption && <Typography variant="caption">{IMAGE_NOT_AVAILABLE}</Typography>}
    </Box>
  );
}

interface MovieSlideProps {
  readonly movie: BillboardMovie;
  readonly hasImageError: boolean;
  readonly onImageError: (movieId: number) => void;
}

function MovieSlide({ movie, hasImageError, onImageError }: MovieSlideProps) {
  const posterUrl = getPosterUrl(movie.POSTER);
  const showPoster = posterUrl !== null && !hasImageError;

  return (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'grey.800' }}>
      {showPoster && (
        <>
          {}
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: -24,
              backgroundImage: `url("${posterUrl}")`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(18px) brightness(0.55)'
            }}
          />
          <Box
            component="img"
            src={posterUrl}
            alt={movie.MOVIE_TITLE}
            onError={() => onImageError(movie.ID_MOVIE)}
            sx={{
              position: 'absolute',
              top: '50%',
              right: { xs: '50%', md: '12%' },
              transform: { xs: 'translate(50%, -50%)', md: 'translateY(-50%)' },
              height: '86%',
              maxWidth: '60%',
              objectFit: 'contain',
              borderRadius: 1,
              boxShadow: 6
            }}
          />
        </>
      )}
      {!showPoster && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ImagePlaceholder />
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          px: { xs: 7, md: 9 },
          pb: 3,
          pt: 8,
          background: 'linear-gradient(to top, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0))',
          color: 'common.white'
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 1.5, opacity: 0.85 }}>
          En cartelera
        </Typography>
        <Typography variant="h5" component="p" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {movie.MOVIE_TITLE}
        </Typography>
      </Box>
    </Box>
  );
}

interface CarouselIndicatorProps {
  readonly total: number;
  readonly currentIndex: number;
  readonly onSelect: (index: number) => void;
}

function CarouselIndicator({ total, currentIndex, onSelect }: CarouselIndicatorProps) {
  return (
    <Box sx={{ position: 'absolute', right: 24, bottom: 24, display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.75 }}>
        {Array.from({ length: total }, (_, index) => (
          <Box
            key={index}
            component="button"
            type="button"
            aria-label={`Ir a la película ${index + 1}`}
            aria-current={index === currentIndex}
            onClick={() => onSelect(index)}
            sx={{
              width: index === currentIndex ? 20 : 8,
              height: 8,
              p: 0,
              border: 0,
              borderRadius: 4,
              cursor: 'pointer',
              bgcolor: index === currentIndex ? 'common.white' : 'rgba(255, 255, 255, 0.5)',
              transition: 'width 0.2s'
            }}
          />
        ))}
      </Box>
      <Typography variant="body2" sx={{ color: 'common.white', fontWeight: 600 }}>
        {currentIndex + 1} / {total}
      </Typography>
    </Box>
  );
}

export default function MovieCarousel() {
  const { movies, isLoadingMovies, moviesError } = useBillboardMovies();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<number[]>([]);

  const total = movies.length;
  const activeIndex = total > 0 ? currentIndex % total : 0;

  //Advances every5 seconds and goes back to the first movie after the last one.
  useEffect(() => {
    if (total <= 1 || isPaused) {
      return undefined;
    }
    const timer = setTimeout(() => setCurrentIndex((index) => (index + 1) % total), AUTOPLAY_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, total, isPaused]);

  const goToPrevious = () => setCurrentIndex((activeIndex - 1 + total) % total);
  const goToNext = () => setCurrentIndex((activeIndex + 1) % total);

  const handleImageError = (movieId: number) => {
    setFailedImageIds((ids) => (ids.includes(movieId) ? ids : [...ids, movieId]));
  };

  if (isLoadingMovies) {
    return (
      <StateFrame>
        <CircularProgress size={32} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {LOADING_MESSAGE}
        </Typography>
      </StateFrame>
    );
  }

  if (moviesError) {
    return (
      <StateFrame isError>
        <Typography sx={{ color: 'error.main', fontWeight: 700 }}>{ERROR_TITLE}</Typography>
        <Typography variant="body2" sx={{ color: 'error.dark' }}>
          {ERROR_DESCRIPTION}
        </Typography>
      </StateFrame>
    );
  }

  if (total === 0) {
    return (
      <StateFrame>
        <ImagePlaceholder showCaption={false} />
        <Typography sx={{ fontWeight: 700 }}>{EMPTY_TITLE}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {EMPTY_DESCRIPTION}
        </Typography>
      </StateFrame>
    );
  }

  const currentMovie: BillboardMovie = movies[activeIndex];

  return (
    <Box
      component="section"
      aria-roledescription="carrusel"
      aria-label="Películas en cartelera"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      sx={FRAME_SX}
    >
      <MovieSlide
        key={currentMovie.ID_MOVIE}
        movie={currentMovie}
        hasImageError={failedImageIds.includes(currentMovie.ID_MOVIE)}
        onImageError={handleImageError}
      />
      {total > 1 && (
        <>
          <IconButton aria-label="Película anterior" onClick={goToPrevious} sx={{ ...ARROW_SX, left: 16 }}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Película siguiente" onClick={goToNext} sx={{ ...ARROW_SX, right: 16 }}>
            <ChevronRightIcon />
          </IconButton>
        </>
      )}
      <CarouselIndicator total={total} currentIndex={activeIndex} onSelect={setCurrentIndex} />
    </Box>
  );
}
