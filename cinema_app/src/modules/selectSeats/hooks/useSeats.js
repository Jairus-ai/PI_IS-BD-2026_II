import { useQuery } from '@tanstack/react-query';
import { getSeatsList } from '../services/seatsService';

/** @param {number | null} [screeningId] */
export const useSeats = (screeningId = null) => {
  const seatsQuery = useQuery({
    queryKey: ['seats', screeningId],
    queryFn: () => getSeatsList(screeningId),
    enabled: screeningId != null,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  return {
    seats: Array.isArray(seatsQuery.data?.data) ? seatsQuery.data.data : [],
    reservation: seatsQuery.data?.reservation ?? null,
    isLoadingSeats: seatsQuery.isLoading,
    seatsError: seatsQuery.error,
    refetchSeats: seatsQuery.refetch,
  };
};
