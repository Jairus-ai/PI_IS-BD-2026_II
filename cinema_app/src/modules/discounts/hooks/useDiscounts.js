import { useQuery } from '@tanstack/react-query';
import {
  getDiscounts,
  getDiscountsByName,
  getDiscountsByID
} from '../services/discountService';

export const useDiscounts = (discountName = null) => {
  const discountsQuery = useQuery({
    queryKey: ['discounts'],
    queryFn: getDiscounts,
  });

  const discountByName = useQuery({
    queryKey: ['discount', discountName],
    queryFn: () => getDiscountsByName(discountName),
    enabled: !!discountName,
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

    discountDetail: discountDetailQuery.data ?? null,
    isLoadingDetail: discountDetailQuery.isLoading,
  };
};