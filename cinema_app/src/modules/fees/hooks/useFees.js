import { useQuery } from '@tanstack/react-query';
import { getFees } from '../services/feeService';

// Invalidate this key after adding, modifying or deactivating a fee to refresh the list
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
