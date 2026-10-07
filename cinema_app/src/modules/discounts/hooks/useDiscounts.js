import { useQuery } from '@tanstack/react-query';
import { getDiscounts } from '../services/discountService';

export const useDiscounts = (discountName = null) => {
  const discountsQuery = useQuery({
    queryKey: ['discounts'],
    queryFn: getDiscounts,
  });

  const discountDetailQuery = useQuery({
    queryKey: ['discount', discountName],
    queryFn: () => getDiscountsById(Number(discountId)),
    enabled: !!discountName,
  });

  return {
    discounts: discountsQuery.data ?? [],
    isLoadingDiscounts: discountsQuery.isLoading,
    discountsError: discountsQuery.error,
    refetchDiscounts: discountsQuery.refetch,

    discountDetail: discountDetailQuery.data ?? null,
    isLoadingDetail: discountDetailQuery.isLoading,
    discountDetailError: discountDetailQuery.error,
  };
};