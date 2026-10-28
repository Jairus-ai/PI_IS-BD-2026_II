import { useQuery } from '@tanstack/react-query';
import { getFees } from '../services/feeService';

export const FEES_QUERY_KEY = ['fees'];

export const useFees = () => {
  const feesQuery = useQuery({
    queryKey: FEES_QUERY_KEY,
    queryFn: getFees
  });

  return {
    fees: Array.isArray(feesQuery.data) ? feesQuery.data : [],
    isLoadingFees: feesQuery.isLoading,
    feesError: feesQuery.error,
    refetchFees: feesQuery.refetch
  };
};
