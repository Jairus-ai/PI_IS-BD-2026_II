import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import {
  useNavigate,
  useSearchParams
} from 'react-router';
import { usePaymentStatus } from '../hooks/usePayments';
import type { PaymentStatus } from '../types/payments';

interface PaymentResultProps {
  success: boolean;
}

interface ResultText {
  title: string;
  message: string;
}

const PAID_TEXT: ResultText = {
  title: 'Su pago ha sido procesado',
  message: 'Gracias por su compra. Enviamos sus entradas con los códigos QR a su correo electrónico.'
};
const REJECTED_TEXT: ResultText = {
  title: 'No se pudo completar la compra',
  message: 'Su reserva expiró antes de confirmar el pago. No se realizó ningún cobro.'
};
const PENDING_TEXT: ResultText = {
  title: 'Confirmando su pago',
  message: 'Esto puede tardar unos segundos.'
};
const ERROR_TEXT: ResultText = {
  title: 'No se pudo confirmar el pago',
  message: 'Revise su historial de compras en unos minutos.'
};
const CANCEL_TEXT: ResultText = {
  title: 'El pago fue cancelado',
  message: 'No se realizó ningún cobro. Puede intentarlo de nuevo mientras su reserva siga vigente.'
};

const STATUS_TEXT: Record<PaymentStatus, ResultText> = {
  PAID: PAID_TEXT,
  REJECTED: REJECTED_TEXT,
  PENDING: PENDING_TEXT
};

function getResultText(success: boolean, status: PaymentStatus | null, hasError: boolean): ResultText {
  if (!success)
    return CANCEL_TEXT;

  if (hasError)
    return ERROR_TEXT;

  return status
    ? STATUS_TEXT[status]
    : PENDING_TEXT;
}

export default function PaymentResult({ success }: Readonly<PaymentResultProps>) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = success
    ? searchParams.get('session_id')
    : null;
  const {
    paymentStatus,
    statusError
  } = usePaymentStatus(sessionId);

  const status = paymentStatus as PaymentStatus | null;
  const hasError = Boolean(statusError) || (success && !sessionId);
  const text = getResultText(success, status, hasError);
  const isPending = success && !hasError && (status === null || status === 'PENDING');
  const isPaid = success && !hasError && status === 'PAID';
  const iconColor = isPaid
    ? 'success'
    : 'error';
  const ResultIcon = isPaid
    ? CheckCircleOutlineIcon
    : success && !hasError
      ? HighlightOffIcon
      : ErrorOutlineIcon;

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 520,
          p: 4,
          boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05), 0px 15px 35px -5px rgba(0, 0, 0, 0.05)'
        }}
      >
        <Stack
          spacing={2}
          sx={{
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          {isPending
            ? <CircularProgress size={56} />
            : <ResultIcon color={iconColor} sx={{ fontSize: 64 }} />}

          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {text.title}
          </Typography>

          <Typography color="text.secondary">
            {text.message}
          </Typography>

          <Stack
            direction="row"
            spacing={2}
            sx={{ pt: 2 }}
          >
            {success
              ? null
              : (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/payment')}
                >
                  Intentar de nuevo
                </Button>
              )}
            <Button
              variant="contained"
              disableElevation
              disabled={isPending}
              onClick={() => navigate('/')}
            >
              Volver al inicio
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Box>
  );
}
