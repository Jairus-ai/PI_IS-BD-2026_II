import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
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
      <Typography sx={{ color: 'primary.dark' }}>{label}</Typography>
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
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
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
      <DetailField label="Reembolsada" value={purchase.IS_REFUNDED ? 'Sí' : 'No'} />
    </Box>
  );
}

export default function PurchaseDetailDialog({ purchaseId, onClose }: PurchaseDetailDialogProps) {
  const [displayedId, setDisplayedId] = useState<number | null>(purchaseId);
  if (purchaseId !== null && purchaseId !== displayedId) {
    setDisplayedId(purchaseId);
  }

  const { purchase, isLoadingPurchase, purchaseError, refetchPurchase } = usePurchaseDetail(displayedId);

  const renderContent = () => {
    if (isLoadingPurchase) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      );
    }
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
    <Dialog
      open={purchaseId !== null}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 2 } } }}
    >
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700, pr: 6 }}>
        Compra #{displayedId}
        <IconButton aria-label="Cerrar" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>{renderContent()}</DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
