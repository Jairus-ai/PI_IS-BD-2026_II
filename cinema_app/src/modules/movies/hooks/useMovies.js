import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMovie,
  updateMovie,
  getMovies,
  getMoviesCount,
  getMovieById,
  getGenres,
  getRatings,
  getLanguages,
  getAudiovisualFormats,
  getDirectors,
  uploadPoster,
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
    queryKey: ['movie', movieId],
    queryFn: () => getMovieById(movieId),
    enabled: movieId != null,
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

  const directorsQuery = useQuery({
    queryKey: ['directors'],
    queryFn: getDirectors,
  });

  const queryClient = useQueryClient();
  const createMovieMutation = useMutation({
    mutationFn: createMovie,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['moviesCount'] });
    },
  });

  const updateMovieMutation = useMutation({
    mutationFn: ({ id, movie }) => updateMovie(id, movie),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      queryClient.invalidateQueries({ queryKey: ['movie', variables.id] });
    },
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
    directors: directorsQuery.data?.data ?? [],
    isLoadingCatalogs:
      genresQuery.isLoading ||
      ratingsQuery.isLoading ||
      languagesQuery.isLoading ||
      formatsQuery.isLoading ||
      directorsQuery.isLoading,

    uploadPoster,
    createMovie: createMovieMutation.mutateAsync,
    isCreatingMovie: createMovieMutation.isPending,
    createMovieError: createMovieMutation.error,
    updateMovie: (id, movie) => updateMovieMutation.mutateAsync({ id, movie }),
    isUpdatingMovie: updateMovieMutation.isPending,
  };
};