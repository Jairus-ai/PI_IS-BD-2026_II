import { useQuery } from '@tanstack/react-query';
import { getDiscounts, getDiscountProducts, getDiscountsByIDForEdit } from '../services/discountService';

export const useDiscounts = (discountId) => {
  const discountsQuery = useQuery({
    queryKey: ['discounts'],
    queryFn: getDiscounts,
  });

  const discountDetailQuery = useQuery({
    queryKey: ['discount', discountId],
    queryFn: () => getDiscountsByIDForEdit(Number(discountId)),
    enabled: discountId != null,
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

export const useDiscountProducts = (type) => {
  const query = useQuery({
    queryKey: ['discount-products', type],
    queryFn: () => getDiscountProducts(String(type)),
    enabled: type != null,
  });

  return {
    products: Array.isArray(query.data) ? query.data : [],
    isLoadingProducts: query.isLoading,
    productsError: query.error,
  };
};