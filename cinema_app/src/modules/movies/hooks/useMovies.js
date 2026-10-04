import { useQuery } from '@tanstack/react-query';
import {
  getMovies,
  getMovieById,
  getGenres,
  getRatings,
  getLanguages,
  getAudiovisualFormats,
} from '../services/movieService';

export const useMovies = (movieId = null) => {
  const moviesQuery = useQuery({
    queryKey: ['movies'],
    queryFn: getMovies,
  });

  const movieDetailQuery = useQuery({
    queryKey: ['movies', movieId],
    queryFn: () => getMovieById(movieId),
    enabled: !!movieId,
  });

  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: getGenres,
  });

  const ratingsQuery = useQuery({
    queryKey: ['ratings'],
    queryFn: getRatings,
  });

  const languagesQuery = useQuery({
    queryKey: ['languages'],
    queryFn: getLanguages,
  });

  const formatsQuery = useQuery({
    queryKey: ['audiovisualFormats'],
    queryFn: getAudiovisualFormats,
  });

  return {
    movies: moviesQuery.data ?? [],
    isLoadingMovies: moviesQuery.isLoading,
    moviesError: moviesQuery.error,

    movieDetail: movieDetailQuery.data ?? null,
    isLoadingDetail: movieDetailQuery.isLoading,

    genres: genresQuery.data ?? [],
    ratings: ratingsQuery.data ?? [],
    languages: languagesQuery.data ?? [],
    formats: formatsQuery.data ?? [],
    isLoadingCatalogs:
      genresQuery.isLoading ||
      ratingsQuery.isLoading ||
      languagesQuery.isLoading ||
      formatsQuery.isLoading,
  };
};