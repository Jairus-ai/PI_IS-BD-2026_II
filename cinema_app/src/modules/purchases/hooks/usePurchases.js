import { useQuery } from '@tanstack/react-query';
import { getPurchaseDetail, getPurchaseHistory } from '../services/purchaseService';

export const PURCHASES_QUERY_KEY = ['purchases'];

export const usePurchaseHistory = () => {
  const historyQuery = useQuery({
    queryKey: PURCHASES_QUERY_KEY,
    queryFn: getPurchaseHistory
  });

  return {
    purchases: Array.isArray(historyQuery.data) ? historyQuery.data : [],
    isLoadingPurchases: historyQuery.isLoading,
    purchasesError: historyQuery.error,
    refetchPurchases: historyQuery.refetch
  };
};

export const usePurchaseDetail = (purchaseId) => {
  const detailQuery = useQuery({
    queryKey: [...PURCHASES_QUERY_KEY, purchaseId],
    queryFn: () => getPurchaseDetail(purchaseId),
    enabled: purchaseId != null
  });

  return {
    purchase: detailQuery.data ?? null,
    isLoadingPurchase: detailQuery.isLoading,
    purchaseError: detailQuery.error,
    refetchPurchase: detailQuery.refetch
  };
};
