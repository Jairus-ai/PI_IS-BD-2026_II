import { useQuery } from '@tanstack/react-query';
import {
  getDiscounts,
  getDiscountsByID
} from '../services/discountService';

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

  console.log(discountsQuery.data);

  return {
    discounts: discountsQuery.data ?? [],
    isLoadingDiscounts: discountsQuery.isLoading,
    discountsError: discountsQuery.error,

    discountDetail: discountDetailQuery.data ?? null,
    isLoadingDetail: discountDetailQuery.isLoading,
  };
};