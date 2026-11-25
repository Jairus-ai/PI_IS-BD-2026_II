import { useQuery } from '@tanstack/react-query';
import { getBillboardMovies, getNowShowingMovies } from '../services/billboardService';

export const BILLBOARD_MOVIES_QUERY_KEY = ['billboard-movies'];
export const NOW_SHOWING_QUERY_KEY = ['now-showing-movies'];

export const useBillboardMovies = () => {
  const moviesQuery = useQuery({
    queryKey: BILLBOARD_MOVIES_QUERY_KEY,
    queryFn: getBillboardMovies
  });

  return {
    movies: Array.isArray(moviesQuery.data) ? moviesQuery.data : [],
    isLoadingMovies: moviesQuery.isLoading,
    moviesError: moviesQuery.error
  };
};

export const useNowShowingMovies = () => {
  const moviesQuery = useQuery({
    queryKey: NOW_SHOWING_QUERY_KEY,
    queryFn: getNowShowingMovies
  });

  return {
    movies: Array.isArray(moviesQuery.data) ? moviesQuery.data : [],
    isLoadingMovies: moviesQuery.isLoading,
    moviesError: moviesQuery.error,
    refetchMovies: moviesQuery.refetch
  };
};
