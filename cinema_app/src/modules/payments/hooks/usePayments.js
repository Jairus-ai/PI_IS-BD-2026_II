import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import {
  createPaymentIntent,
  getPaymentReservation,
  getPaymentStatus
} from '../services/paymentService';

const PENDING_STATUS = 'PENDING';
const STATUS_POLL_INTERVAL_MS = 2000;

export const usePaymentReservation = () => {
  const reservationQuery = useQuery({
    queryKey: ['paymentReservation'],
    queryFn: getPaymentReservation,
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0
  });

  return {
    reservation: reservationQuery.data ?? null,
    isLoadingReservation: reservationQuery.isLoading,
    reservationError: reservationQuery.error
  };
};

export const useCreatePaymentIntent = () => {
  const mutation = useMutation({
    mutationFn: createPaymentIntent
  });

  return {
    createPaymentIntent: mutation.mutateAsync,
    isCreatingPaymentIntent: mutation.isPending
  };
};

export const usePaymentStatus = (sessionId) => {
  const statusQuery = useQuery({
    queryKey: ['paymentStatus', sessionId],
    queryFn: () => getPaymentStatus(sessionId),
    enabled: Boolean(sessionId),
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
    refetchInterval: (query) => query.state.data?.status === PENDING_STATUS
      ? STATUS_POLL_INTERVAL_MS
      : false
  });

  return {
    paymentStatus: statusQuery.data?.status ?? null,
    isLoadingStatus: statusQuery.isLoading,
    statusError: statusQuery.error
  };
};
