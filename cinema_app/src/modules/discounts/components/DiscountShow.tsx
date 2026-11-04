import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import { getDiscountsByID } from '../services/discountService';
import type {Discount} from '../types/discounts';

function DetailItem({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
  return (
    <Box>
      <Typography variant="body2" sx={{ color: 'primary.dark' }}>
        {label}
      </Typography>

      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  );
}

export default function DiscountShow({
  discountId,
  onClose,
}: Readonly<{
  discountId: number | string | null | undefined;
  onClose: () => void;
}>) {
  const [discount, setDiscount] = React.useState<Discount | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    if (!discountId) {
      setDiscount(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await getDiscountsByID(Number(discountId));
      setDiscount(Array.isArray(response?.data) ? response.data[0] ?? null : null);
    } catch (showDataError) {
      setError(
        showDataError instanceof Error ? showDataError : new Error(String(showDataError)),
      );
      setDiscount(null);
    } finally {
      setIsLoading(false);
    }
  }, [discountId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <Dialog
      open={discountId !== null && discountId !== undefined}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'background.paper',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          color: 'primary.dark',
          fontWeight: 700,
          position: 'relative',
          pr: 6,
        }}
      >
        {discount?.DISCOUNT_NAME ?? 'Descuento'}

        <IconButton
          onClick={onClose}
          aria-label="Cerrar"
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: 'text.secondary',
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: 'background.default' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && <Alert severity="error">{error.message}</Alert>}

        {!isLoading && !error && !discount && (
          <Alert severity="info">No se encontró información del descuento.</Alert>
        )}

        {!isLoading && !error && discount && (
          <Stack spacing={2}>
            <DetailItem label="Nombre" value={discount.DISCOUNT_NAME} />
            <DetailItem label="Porcentaje" value={`${discount.DISCOUNT_PORCENTAGE}%`} />

            <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap' }}>
              <DetailItem label="Fecha de inicio" value={discount.DISCOUNT_START_DATE} />
              <DetailItem label="Fecha de finalización" value={discount.DISCOUNT_FINISH_DATE} />
            </Stack>

            <Box>
              <Typography variant="body2" sx={{ color: 'primary.dark' }}>
                Tipo de descuento
              </Typography>

              <Box>
                <Chip label={discount.TYPE} color="primary" variant="outlined" />
              </Box>
            </Box>

            <DetailItem label="Producto" value={discount.NAME_FK_PRODUCT} />
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            fontSize: '14px',
            borderRadius: '8px',
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
