import { useState } from 'react';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { isAxiosError } from 'axios';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import useNotifications from '../../../hooks/useNotifications';
import { useRefundPurchase } from '../hooks/usePurchases';
import {
  formatDateTime,
  getMovieTitle,
  type PurchaseHistoryEntry
} from '../types/purchases';

const UNAVAILABLE_TITLE = 'No es posible realizar el reembolso';
const UNAVAILABLE_MESSAGES = [
  'No se puede solicitar un reembolso para una proyección que está próxima a realizarse.',
  'Debe solicitar el reembolso con un mínimo de 5 días antes de la proyección.'
];
const CONFIRMATION_TITLE = 'Solicitud de reembolso';
const CONFIRMATION_WARNING = `Una vez aceptado el reembolso los asientos quedarán
                              libres para su venta. Esta acción no es reversible.`;
const SUCCESS_MESSAGE = 'El reembolso se realizó correctamente';
const ERROR_MESSAGE = 'No se pudo realizar el reembolso';

const REASON_STATUSES = new Set([
  401,
  403,
  404,
  409,
  422
]);

interface PurchaseRefundDialogProps {
  readonly purchase: PurchaseHistoryEntry | null;
  readonly onClose: () => void;
}

function getConfirmationMessage(purchase: PurchaseHistoryEntry): string {
  return `¿Desea solicitar un reembolso para la proyección de
  ${getMovieTitle(purchase)} en la fecha ${formatDateTime(purchase.SCREENING_DATE)}?`;
}

function getErrorMessage(error: unknown): string {
  if (!isAxiosError<{ message?: string }>(error))
    return ERROR_MESSAGE;

  const reason = error.response?.data?.message;
  const hasServerReason = REASON_STATUSES.has(error.response?.status ?? 0) && Boolean(reason);

  return hasServerReason
    ? `${ERROR_MESSAGE}. Motivo: ${reason}`
    : ERROR_MESSAGE;
}

export default function PurchaseRefundDialog({ purchase, onClose }: PurchaseRefundDialogProps) {
  const [displayedPurchase, setDisplayedPurchase] = useState<PurchaseHistoryEntry | null>(purchase);
  const notifications = useNotifications();
  const { refundPurchase, isRefundingPurchase } = useRefundPurchase();

  if (purchase && purchase !== displayedPurchase)
    setDisplayedPurchase(purchase);

  const isOnTime = displayedPurchase?.IS_REFUND_ON_TIME ?? false;

  const handleClose = () => {
    if (!isRefundingPurchase)
      onClose();
  };

  const handleConfirm = async () => {
    if (!displayedPurchase)
      return;

    try {
      await refundPurchase(displayedPurchase.ID_RECEIPT);
      notifications.show(SUCCESS_MESSAGE, {
        severity: 'success',
        autoHideDuration: 3000
      });
      onClose();

    } catch (error) {
      notifications.show(getErrorMessage(error), {
        severity: 'error',
        autoHideDuration: 5000
      });
    }
  };

  const actions = isOnTime
    ? (
      <>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={isRefundingPurchase}
        >
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleConfirm()}
          loading={isRefundingPurchase}
        >
          Solicitar reembolso
        </Button>
      </>
    )
    : <Button onClick={handleClose}>Cerrar</Button>;

  const messages = isOnTime && displayedPurchase
    ? [
      getConfirmationMessage(displayedPurchase),
      CONFIRMATION_WARNING
    ]
    : UNAVAILABLE_MESSAGES;

  return (
    <CrudDialog
      open={purchase !== null}
      title={isOnTime
        ? CONFIRMATION_TITLE
        : UNAVAILABLE_TITLE}
      onClose={handleClose}
      actions={actions}
    >
      <Stack spacing={2}>
        {messages.map((message) => (
          <Typography key={message}>{message}</Typography>
        ))}
      </Stack>
    </CrudDialog>
  );
}
