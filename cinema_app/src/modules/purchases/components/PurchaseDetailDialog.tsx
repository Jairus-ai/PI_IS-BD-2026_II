import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
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

const HALF = { xs: 12, sm: 6 };

function PurchaseFields({ purchase }: { readonly purchase: PurchaseDetail }) {
  return (
    <Grid container spacing={2}>
      <Grid size={HALF}><DetailField label="Película" value={getMovieTitle(purchase)} /></Grid>
      <Grid size={HALF}><DetailField label="Sucursal" value={purchase.LOCATION_NAME ?? 'No disponible'} /></Grid>
      <Grid size={HALF}><DetailField label="Fecha y hora de la proyección" value={formatDateTime(purchase.SCREENING_DATE)} /></Grid>
      <Grid size={HALF}><DetailField label="Fecha y hora de la compra" value={formatDateTime(purchase.RECEIPT_DATE)} /></Grid>
      <Grid size={HALF}><DetailField label="Asientos y tarifas" value={listOrDefault(purchase.SEATS.map(getSeatFee))} /></Grid>
      <Grid size={HALF}><DetailField label="Snacks" value={listOrDefault(purchase.SNACKS.map(getSnackLine))} /></Grid>
      <Grid size={HALF}><DetailField label="Descuento" value={listOrDefault(purchase.DISCOUNTS.map(getDiscountLine))} /></Grid>
      <Grid size={HALF}><DetailField label="Monto" value={formatAmount(purchase.TOTAL_AMOUNT)} /></Grid>
      <Grid size={HALF}><DetailField label="Número de compra" value={String(purchase.ID_RECEIPT)} /></Grid>
      {purchase.IS_REFUNDED && <Grid size={HALF}><DetailField label="Reembolsada" value="Sí" /></Grid>}
    </Grid>
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
      title="Detalle de la compra"
      onClose={onClose}
      loading={isLoadingPurchase}
      actions={<Button onClick={onClose}>Cerrar</Button>}
    >
      {renderContent()}
    </CrudDialog>
  );
}
