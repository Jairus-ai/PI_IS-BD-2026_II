import { useQuery } from '@tanstack/react-query';
import {
  getMovies,
  getMoviesCount,
  getMovieById,
  getGenres,
  getRatings,
  getLanguages,
  getAudiovisualFormats,
} from '../services/movieService';

export const useMovies = (page = 1, movieId = null) => {
  const moviesQuery = useQuery({
    queryKey: ['movies', page],
    queryFn: ()  => getMovies(page),
  });

  const countQuery = useQuery({
    queryKey: ['moviesCount'],
    queryFn: getMoviesCount,
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
    movies: moviesQuery.data?.data ?? [],
    totalMovies: countQuery.data?.total ?? 0,
    isLoadingMovies: moviesQuery.isLoading,
    moviesError: moviesQuery.error,

    movieDetail: movieDetailQuery.data?.data ?? null,
    isLoadingDetail: movieDetailQuery.isLoading,

    genres: genresQuery.data?.data ?? [],
    ratings: ratingsQuery.data?.data ?? [],
    languages: languagesQuery.data?.data ?? [],
    formats: formatsQuery.data?.data ?? [],
    isLoadingCatalogs:
      genresQuery.isLoading ||
      ratingsQuery.isLoading ||
      languagesQuery.isLoading ||
      formatsQuery.isLoading,
  };
};