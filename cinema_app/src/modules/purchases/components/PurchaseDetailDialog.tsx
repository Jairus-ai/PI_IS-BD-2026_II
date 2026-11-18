import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { usePurchaseDetail } from '../hooks/usePurchases';
import {
  formatAmount,
  formatDateTime,
  getDiscountLine,
  getMovieTitle,
  getSeatFee,
  getSeatName,
  getSnackLine,
  type PurchaseDetail
} from '../types/purchases';

const LOAD_ERROR_MESSAGE = 'No se pudo cargar el detalle de la compra.';
const NOT_APPLICABLE = 'No aplica';

interface PurchaseDetailDialogProps {
  readonly purchaseId: number | null;
  readonly onClose: () => void;
}

interface DetailFieldProps {
  readonly label: string;
  readonly value: string | string[];
}

function DetailField({ label, value }: DetailFieldProps) {
  const lines = Array.isArray(value) ? value : [value];
  return (
    <div>
      <Typography variant="caption" sx={{ color: 'primary.dark' }}>{label}</Typography>
      {lines.map((line) => (
        <Typography key={line}>{line}</Typography>
      ))}
    </div>
  );
}

function listOrDefault(lines: string[]): string | string[] {
  return lines.length > 0 ? lines : NOT_APPLICABLE;
}

function PurchaseFields({ purchase }: { readonly purchase: PurchaseDetail }) {
  return (
    <Stack spacing={1.5}>
      <DetailField label="Sucursal" value={purchase.LOCATION_NAME ?? 'No disponible'} />
      <DetailField label="Número de compra" value={String(purchase.ID_RECEIPT)} />
      <DetailField label="Fecha y hora de la compra" value={formatDateTime(purchase.RECEIPT_DATE)} />
      <DetailField label="Monto" value={formatAmount(purchase.TOTAL_AMOUNT)} />
      <DetailField label="Película" value={getMovieTitle(purchase)} />
      <DetailField label="Fecha y hora de la proyección" value={formatDateTime(purchase.SCREENING_DATE)} />
      <DetailField label="Asientos" value={listOrDefault([purchase.SEATS.map(getSeatName).join(', ')].filter(Boolean))} />
      <DetailField label="Tarifa" value={listOrDefault(purchase.SEATS.map(getSeatFee))} />
      <DetailField label="Snacks" value={listOrDefault(purchase.SNACKS.map(getSnackLine))} />
      <DetailField label="Descuento" value={listOrDefault(purchase.DISCOUNTS.map(getDiscountLine))} />
      {purchase.IS_REFUNDED && <DetailField label="Reembolsada" value="Sí" />}
    </Stack>
  );
}

export default function PurchaseDetailDialog({ purchaseId, onClose }: PurchaseDetailDialogProps) {
  const [displayedId, setDisplayedId] = useState<number | null>(purchaseId);
  if (purchaseId !== null && purchaseId !== displayedId) {
    setDisplayedId(purchaseId);
  }

  const { purchase, isLoadingPurchase, purchaseError, refetchPurchase } = usePurchaseDetail(displayedId);

  const renderContent = () => {
    if (purchaseError || !purchase) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchPurchase()}>
              Reintentar
            </Button>
          }
        >
          {LOAD_ERROR_MESSAGE}
        </Alert>
      );
    }
    return <PurchaseFields purchase={purchase} />;
  };

  return (
    <CrudDialog
      open={purchaseId !== null}
      title={`Compra #${displayedId}`}
      onClose={onClose}
      loading={isLoadingPurchase}
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {renderContent()}
    </CrudDialog>
  );
}
