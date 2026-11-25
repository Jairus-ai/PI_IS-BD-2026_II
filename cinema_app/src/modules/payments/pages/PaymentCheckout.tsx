import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router';
import PageContainer from '../../../components/common/PageContainer';
import useNotifications from '../../../hooks/useNotifications';
import useReservationCountdown from '../../../hooks/useReservationCountdown';
import { getErrorMessage } from '../../../services/errorMessage';
import { FEE_TYPE_LABELS } from '../../fees/types/fees';
import { formatAmount, formatDateTime } from '../../purchases/types/purchases';
import { cancelReservation } from '../../selectSeats/services/seatsService';
import {
  useCreatePaymentIntent,
  usePurchaseSummary
} from '../hooks/usePayments';
import type {
  PaymentIntentResponse,
  PurchaseSummary
} from '../types/payments';

const RESERVATION_EXPIRED_CODE = 'RESERVATION_EXPIRED';
const RESERVATION_EXPIRED_MESSAGE = 'El tiempo para completar la compra expiró';
const LOAD_ERROR_MESSAGE = 'No se pudo cargar el resumen de la compra';
const PAYMENT_ERROR_MESSAGE = 'No se pudo iniciar el pago';
const NOTIFICATION_MS = 5000;

const CARD_HEADER_SX = {
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  px: 2,
  py: 1.5,
  fontWeight: 700
};

function getErrorCode(error: unknown): string | undefined {
  return isAxiosError<{ code?: string }>(error) ? error.response?.data?.code : undefined;
}

function SummaryCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Typography variant="h6" component="h2" sx={CARD_HEADER_SX}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

function DetailRow({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 0.5, sm: 2 }}
      sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}
    >
      <Typography sx={{ fontWeight: 600, minWidth: { sm: 220 } }}>{label}</Typography>
      <Typography>{value}</Typography>
    </Stack>
  );
}

function AmountRow({ label, amount, bold = false }: Readonly<{ label: string; amount: string; bold?: boolean }>) {
  const fontWeight = bold ? 700 : 400;

  return (
    <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
      <Typography sx={{ fontWeight }}>{label}</Typography>
      <Typography sx={{ fontWeight, whiteSpace: 'nowrap' }}>{amount}</Typography>
    </Stack>
  );
}

function PaymentLines({ summary }: Readonly<{ summary: PurchaseSummary }>) {
  return (
    <Stack spacing={1} sx={{ p: 2 }}>
      {summary.tickets.map((ticket) => (
        <AmountRow
          key={ticket.seatId}
          label={`${ticket.seat} - ${FEE_TYPE_LABELS[ticket.feeType]}`}
          amount={formatAmount(ticket.price)}
        />
      ))}
      {summary.snacks.map((snack) => (
        <AmountRow
          key={snack.snackId}
          label={`${snack.quantity} × ${snack.name}`}
          amount={formatAmount(snack.amount)}
        />
      ))}
      {summary.discounts.map((discount) => (
        <AmountRow
          key={discount.discountId}
          label={discount.name}
          amount={`-${formatAmount(discount.amount)}`}
        />
      ))}
      <Divider />
      <AmountRow label="Subtotal" amount={formatAmount(summary.subtotal)} />
      <AmountRow label="Total" amount={formatAmount(summary.total)} bold />
    </Stack>
  );
}

export default function PaymentCheckout() {
  const navigate = useNavigate();
  const notifications = useNotifications();
  const {
    summary: rawSummary,
    isLoadingSummary,
    summaryError,
    refetchSummary
  } = usePurchaseSummary();
  const {
    createPaymentIntent,
    isCreatingPaymentIntent
  } = useCreatePaymentIntent();
  const payingRef = React.useRef(false);

  const summary = rawSummary as PurchaseSummary | null;
  const isReservationMissing = getErrorCode(summaryError) === RESERVATION_EXPIRED_CODE;
  const countdown = useReservationCountdown(summary?.reservedUntil ?? null);
  const isCountdownExpired = countdown?.isExpired ?? false;
  const screeningId = summary?.screeningId;

  const showExpiredMessage = React.useCallback(() => {
    notifications.show(RESERVATION_EXPIRED_MESSAGE, {
      key: 'payment-reservation-expired',
      severity: 'warning',
      autoHideDuration: NOTIFICATION_MS
    });
  }, [notifications]);

  //the reservation expired while the summary was open, free the seats and choose again
  const returnToSeats = React.useCallback(async () => {
    showExpiredMessage();

    if (screeningId === undefined) {
      void navigate('/', { replace: true });
      return;
    }

    await cancelReservation(screeningId).catch(() => undefined);
    void navigate(`/seats/${screeningId}`, { replace: true });
  }, [navigate, screeningId, showExpiredMessage]);

  React.useEffect(() => {
    if (isCountdownExpired)
      void returnToSeats();
  }, [isCountdownExpired, returnToSeats]);

  //without a reservation the screening is unknown, so the client goes back to the home page
  React.useEffect(() => {
    if (!isReservationMissing)
      return;

    showExpiredMessage();
    void navigate('/', { replace: true });
  }, [isReservationMissing, navigate, showExpiredMessage]);

  const handlePay = async () => {
    if (payingRef.current)
      return;

    payingRef.current = true;

    try {
      const paymentIntent: PaymentIntentResponse = await createPaymentIntent();

      window.location.assign(paymentIntent.url);

    } catch (error) {
      payingRef.current = false;

      if (getErrorCode(error) === RESERVATION_EXPIRED_CODE) {
        void returnToSeats();
        return;
      }

      notifications.show(
        getErrorMessage(error, PAYMENT_ERROR_MESSAGE),
        {
          severity: 'error',
          autoHideDuration: NOTIFICATION_MS
        },
      );
    }
  };

  const handleBack = () => {
    if (screeningId !== undefined)
      void navigate(`/seats/${screeningId}`);
  };

  const renderContent = () => {
    if (isLoadingSummary || isReservationMissing) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress aria-label="Cargando resumen de la compra" />
        </Box>
      );
    }

    if (summaryError || !summary) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchSummary()}>
              Reintentar
            </Button>
          }
        >
          {getErrorMessage(summaryError, LOAD_ERROR_MESSAGE)}
        </Alert>
      );
    }

    return (
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: { md: 'flex-start' } }}>
        <Box sx={{ flex: 2 }}>
          <SummaryCard title="Detalle de la compra">
            <DetailRow label="Película:" value={summary.movieTitle} />
            <DetailRow label="Cine/Sucursal:" value={summary.locationName} />
            <DetailRow label="Sala:" value={`${summary.screenName} - ${summary.screenType}`} />
            <DetailRow label="Función:" value={`${formatDateTime(summary.screeningDate)} - ${summary.movieFormat}`} />
            <DetailRow label="Asientos seleccionados:" value={summary.tickets.map((ticket) => ticket.seat).join(', ')} />
            <DetailRow label="Cantidad de boletos:" value={summary.ticketCount} />
            <DetailRow label="Fecha y hora de compra:" value={formatDateTime(summary.purchaseDate)} />
          </SummaryCard>
        </Box>

        <Stack spacing={2} sx={{ flex: 1, minWidth: { md: 320 } }}>
          <SummaryCard title="Resumen del pago">
            <PaymentLines summary={summary} />
          </SummaryCard>
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
            Proceder al pago
          </Button>
          <Button
            variant="contained"
            color="inherit"
            size="large"
            disableElevation
            disabled={isCreatingPaymentIntent}
            onClick={handleBack}
          >
            Volver
          </Button>
        </Stack>
      </Stack>
    );
  };

  return (
    <PageContainer
      title="Resumen de compra"
      actions={countdown && summary && !summaryError ? (
        <Typography variant="body2" role="timer" sx={{ fontWeight: 700 }}>
          Tus asientos están reservados por {countdown.label}
        </Typography>
      ) : null}
    >
      {renderContent()}
    </PageContainer>
  );
}
