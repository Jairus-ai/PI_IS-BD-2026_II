import { useQuery } from '@tanstack/react-query';
import {
  getMovieInBillboard,
  getMoviesInBillboardsCount,
  getMoviesInBillboardsList
} from '../services/movieInBillboardService';
import { getRatings } from '../../movies/services/movieService';
import { getLocations } from '../../users/services/locationService';
import type { Rating } from '../../movies/types/movies';
import type {
  LocationOption,
  MovieInBillboardDetail,
  MovieInBillboardFilters,
  MovieInBillboardPage
} from '../types/moviesInBillboards';

export const MOVIES_IN_BILLBOARDS_QUERY_KEY = ['movies-in-billboards'];

export const useMoviesInBillboards = (page: number, filters: MovieInBillboardFilters) => {
  const listQuery = useQuery<MovieInBillboardPage>({
    queryKey: [
      ...MOVIES_IN_BILLBOARDS_QUERY_KEY,
      'list',
      page,
      filters
    ],
    queryFn: () => getMoviesInBillboardsList(page, filters)
  });

  const countQuery = useQuery<number>({
    queryKey: [
      ...MOVIES_IN_BILLBOARDS_QUERY_KEY,
      'count',
      filters
    ],
    queryFn: () => getMoviesInBillboardsCount(filters)
  });

  return {
    moviesInBillboards: listQuery.data?.data ?? [],
    totalMoviesInBillboards: countQuery.data ?? 0,
    isLoadingMoviesInBillboards: listQuery.isLoading || countQuery.isLoading,
    moviesInBillboardsError: listQuery.error ?? countQuery.error,
    refetchMoviesInBillboards: () => Promise.all([
      listQuery.refetch(),
      countQuery.refetch()
    ])
  };
};

export const useMovieInBillboard = (movieInBillboardId: number | null) => {
  const detailQuery = useQuery<MovieInBillboardDetail>({
    queryKey: [
      ...MOVIES_IN_BILLBOARDS_QUERY_KEY,
      'detail',
      movieInBillboardId
    ],
    queryFn: () => getMovieInBillboard(movieInBillboardId),
    enabled: movieInBillboardId !== null
  });

  return {
    movieInBillboard: detailQuery.data ?? null,
    isLoadingMovieInBillboard: detailQuery.isLoading,
    movieInBillboardError: detailQuery.error,
    refetchMovieInBillboard: detailQuery.refetch
  };
};

export const useMovieInBillboardFilterOptions = () => {
  const ratingsQuery = useQuery<{ data: Rating[] }>({
    queryKey: ['ratings'],
    queryFn: getRatings
  });

  const locationsQuery = useQuery<LocationOption[]>({
    queryKey: ['location-options'],
    queryFn: getLocations
  });

  return {
    ratings: ratingsQuery.data?.data ?? [],
    locations: locationsQuery.data ?? []
  };
};
