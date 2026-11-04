import { useQuery } from '@tanstack/react-query';
import { getSeatsList } from '../services/seatsService';

/** @param {number | null} [screeningId] */
export const useSeats = (screeningId = null) => {
  const seatsQuery = useQuery({
    queryKey: ['seats', screeningId],
    queryFn: () => getSeatsList(screeningId),
    enabled: screeningId != null,
    refetchInterval: 500,
  });

  return {
    seats: Array.isArray(seatsQuery.data) ? seatsQuery.data : [],
    isLoadingSeats: seatsQuery.isLoading,
    seatsError: seatsQuery.error,
  };
};