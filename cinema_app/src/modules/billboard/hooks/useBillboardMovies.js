import { useQuery } from '@tanstack/react-query';
import { getBillboardMovies } from '../services/billboardService';

export const BILLBOARD_MOVIES_QUERY_KEY = ['billboard-movies'];

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
