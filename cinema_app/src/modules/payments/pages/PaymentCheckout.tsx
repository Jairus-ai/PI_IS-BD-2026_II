import * as React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router';
import PageContainer from '../../../components/common/PageContainer';
import useNotifications from '../../../hooks/useNotifications';
import useReservationCountdown from '../../../hooks/useReservationCountdown';
import {
  useCreatePaymentIntent,
  usePaymentReservation
} from '../hooks/usePayments';
import type {
  PaymentIntentResponse,
  PaymentRequest,
  PaymentReservation
} from '../types/payments';
import { getErrorMessage } from '../../../services/errorMessage';

// TODO(Adrián Arias): Once the endpoint are set, replace with data with the actual data.
const PLACEHOLDER_PAYMENT: PaymentRequest = {
  feeId: 1,
  seatPrice: 4500
};

const RESERVATION_EXPIRED_CODE = 'RESERVATION_EXPIRED';
const RESERVATION_EXPIRED_MESSAGE = 'Tu reserva de asientos expiró. Selecciona tus asientos de nuevo.';
const PAYMENT_ERROR_MESSAGE = 'No se pudo iniciar el pago';
const RESERVATION_ERROR_MESSAGE = 'No se pudo cargar la reserva.';

function getErrorResponse(error: unknown): { code?: string; message?: string } | undefined {
  return isAxiosError<{ code?: string; message?: string }>(error)
    ? error.response?.data
    : undefined;
}

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const {
    reservation: rawReservation,
    isLoadingReservation,
    reservationError
  } = usePaymentReservation();
  const {
    createPaymentIntent,
    isCreatingPaymentIntent
  } = useCreatePaymentIntent();

  const reservation = rawReservation as PaymentReservation | null;
  const isReservationMissing = getErrorResponse(reservationError)?.code === RESERVATION_EXPIRED_CODE;
  const countdown = useReservationCountdown(reservation?.reservedUntil ?? null);
  const isCountdownExpired = countdown?.isExpired ?? false;

  React.useEffect(() => {
    if (!isCountdownExpired)
      return;

    notifications.show(RESERVATION_EXPIRED_MESSAGE, {
      key: 'payment-reservation-expired',
      severity: 'warning',
      autoHideDuration: 5000
    });

    void navigate(`/seats/${reservation?.screeningId}`, { replace: true });
  }, [isCountdownExpired, navigate, notifications, reservation?.screeningId]);

  React.useEffect(() => {
    if (!isReservationMissing)
      return;

    notifications.show(RESERVATION_EXPIRED_MESSAGE, {
      key: 'payment-reservation-expired',
      severity: 'warning',
      autoHideDuration: 5000
    });

    void navigate('/', { replace: true });
  }, [isReservationMissing, navigate, notifications]);

  const handlePay = async () => {
    try {
      const paymentIntent: PaymentIntentResponse = await createPaymentIntent(PLACEHOLDER_PAYMENT);

      window.location.assign(paymentIntent.url);

    } catch (error) {
      const errorResponse = getErrorResponse(error);

      if (errorResponse?.code === RESERVATION_EXPIRED_CODE) {
        notifications.show(RESERVATION_EXPIRED_MESSAGE, {
          severity: 'warning',
          autoHideDuration: 5000
        });

        void navigate(`/seats/${reservation?.screeningId}`, { replace: true });

        return;
      }

      notifications.show(
        getErrorMessage(error, PAYMENT_ERROR_MESSAGE),
        {
          severity: 'error',
          autoHideDuration: 3000
        },
      );
    }
  };

  if (isLoadingReservation || isReservationMissing)
    return <CircularProgress />;

  if (!reservation) {
    return (
      <Alert severity="error">
        {`${RESERVATION_ERROR_MESSAGE} ${getErrorResponse(reservationError)?.message ?? ''}`}
      </Alert>
    );
  }

  return (
    <PageContainer title="Pago">
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          maxWidth: 480
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Asientos seleccionados
          </Typography>
          <Typography>
            {reservation.seats
              .map((seat) => `${seat.row}${seat.number}`)
              .join(', ')}
          </Typography>
          <Alert severity="info">
            Sus asientos están reservados por {countdown?.label}. Si el pago no se completa a tiempo, no se le cobrará.
          </Alert>
          <Button
            variant="contained"
            size="large"
            disableElevation
            loading={isCreatingPaymentIntent}
            disabled={isCountdownExpired}
            onClick={() => {
              void handlePay();
            }}
          >
            Pagar
          </Button>
        </Stack>
      </Paper>
    </PageContainer>
  );
}
