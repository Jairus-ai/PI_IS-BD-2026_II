import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFee, deactivateFee, getAudiovisualFormats, getFees, updateFee } from '../services/feeService';

export const FEES_QUERY_KEY = ['fees'];
const FEE_FORMATS_QUERY_KEY = ['fee-audiovisual-formats'];

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

export const useAudiovisualFormats = (enabled = true) => {
  const formatsQuery = useQuery({
    queryKey: FEE_FORMATS_QUERY_KEY,
    queryFn: getAudiovisualFormats,
    enabled
  });

  return {
    formats: Array.isArray(formatsQuery.data) ? formatsQuery.data : [],
    isLoadingFormats: formatsQuery.isLoading,
    formatsError: formatsQuery.error
  };
};

export const useCreateFee = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: addFee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY })
  });

  return {
    createFee: mutation.mutateAsync,
    isCreatingFee: mutation.isPending
  };
};

export const useUpdateFee = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateFee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY })
  });

  return {
    updateFee: mutation.mutateAsync,
    isUpdatingFee: mutation.isPending
  };
};

export const useDeactivateFee = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: deactivateFee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY })
  });

  return {
    deactivateFee: mutation.mutateAsync
  };
};
