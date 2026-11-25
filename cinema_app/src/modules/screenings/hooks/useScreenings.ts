import { useQuery } from '@tanstack/react-query';
import {
  getScreening,
  getScreeningsCount,
  getScreeningsList
} from '../services/screeningService';
import {
  getAudiovisualFormats,
  getRatings
} from '../../movies/services/movieService';
import { getLocations } from '../../users/services/locationService';
import type {
  AudiovisualFormat,
  Rating
} from '../../movies/types/movies';
import type {
  ScreeningDetail,
  ScreeningFilters,
  ScreeningPage
} from '../types/screenings';

export interface LocationOption {
  ID_LOCATION: number;
  LOCATION_NAME: string;
}

export const SCREENINGS_QUERY_KEY = ['screenings'];

export const useScreenings = (page: number, filters: ScreeningFilters) => {
  const listQuery = useQuery<ScreeningPage>({
    queryKey: [
      ...SCREENINGS_QUERY_KEY,
      'list',
      page,
      filters
    ],
    queryFn: () => getScreeningsList(page, filters)
  });

  const countQuery = useQuery<number>({
    queryKey: [
      ...SCREENINGS_QUERY_KEY,
      'count',
      filters
    ],
    queryFn: () => getScreeningsCount(filters)
  });

  return {
    screenings: listQuery.data?.data ?? [],
    totalScreenings: countQuery.data ?? 0,
    isLoadingScreenings: listQuery.isLoading || countQuery.isLoading,
    screeningsError: listQuery.error ?? countQuery.error,
    refetchScreenings: () => Promise.all([
      listQuery.refetch(),
      countQuery.refetch()
    ])
  };
};

export const useScreening = (screeningId: number | null) => {
  const detailQuery = useQuery<ScreeningDetail>({
    queryKey: [
      ...SCREENINGS_QUERY_KEY,
      'detail',
      screeningId
    ],
    queryFn: () => getScreening(screeningId),
    enabled: screeningId !== null
  });

  return {
    screening: detailQuery.data ?? null,
    isLoadingScreening: detailQuery.isLoading,
    screeningError: detailQuery.error,
    refetchScreening: detailQuery.refetch
  };
};

export const useScreeningFilterOptions = () => {
  const locationsQuery = useQuery<LocationOption[]>({
    queryKey: ['location-options'],
    queryFn: getLocations
  });

  const formatsQuery = useQuery<{ data: AudiovisualFormat[] }>({
    queryKey: ['audiovisual-formats'],
    queryFn: getAudiovisualFormats
  });

  const ratingsQuery = useQuery<{ data: Rating[] }>({
    queryKey: ['ratings'],
    queryFn: getRatings
  });

  return {
    locations: locationsQuery.data ?? [],
    formats: formatsQuery.data?.data ?? [],
    ratings: ratingsQuery.data?.data ?? []
  };
};
