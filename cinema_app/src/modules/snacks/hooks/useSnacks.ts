import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSnack,
  updateSnack,
  deleteSnack,
  getSnacks,
  getSnacksCount,
  getSnackById,
} from '../services/snackService';

export const useSnacks = (
  page: number = 1,
  snackId: number | null | undefined = null,
  filters: any = {},
) => {
  const snackQuery = useQuery({
    queryKey: ['snacks', page, filters],
    queryFn: ()  => getSnacks(page, filters),
  });

  const countQuery = useQuery({
    queryKey: ['snacksCount', filters],
    queryFn: () => getSnacksCount(filters),
  });

  const snackDetailQuery = useQuery({
    queryKey: ['snack', snackId],
    queryFn: () => getSnackById(snackId),
    enabled: snackId != null,
  });

  const queryClient = useQueryClient();
  const createSnackMutation = useMutation({
    mutationFn: createSnack,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['snacks'] });
      await queryClient.invalidateQueries({ queryKey: ['snacksCount'] });
    },
  });

  const updateSnackMutation = useMutation({
    mutationFn: ({ id, snack }: {id: number, snack: any}) => updateSnack(id, snack),
    onSuccess: async(_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['snacks'] });
      await queryClient.invalidateQueries({ queryKey: ['snack', variables.id] });
    },
  });

  const deleteSnackMutation = useMutation({
    mutationFn: ({ id }: {id: number}) => deleteSnack(id),
    onSuccess: async(_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['snacks'] });
      await queryClient.invalidateQueries({ queryKey: ['snack', variables.id] });
    },
  });

  return {
    snacks: snackQuery.data?.data ?? [],
    totalsnacks: countQuery.data?.total ?? 0,
    isLoadingSnacks: snackQuery.isLoading,
    SnacksError: snackQuery.error,

    snackDetail: snackDetailQuery.data?.data ?? null,
    isLoadingDetail: snackDetailQuery.isLoading,
  
    createSnack: createSnackMutation.mutateAsync,
    isCreatingSnack: createSnackMutation.isPending,
    createSnackError: createSnackMutation.error,
    updateSnack: (id: number, snack: any) => updateSnackMutation.mutateAsync({ id, snack }),
    isUpdatingSnack: updateSnackMutation.isPending,
    deleteSnack: deleteSnackMutation.mutateAsync,
    isSnackLocation: deleteSnackMutation.isPending,
    deleteSnackError: deleteSnackMutation.error,
  };
};