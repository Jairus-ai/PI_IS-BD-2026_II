import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import {
  getDiscountsByID
} from '../services/discountService';
import type { Discount } from '../types/discounts';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';

interface Props {
  readonly discountId: number | null;
  readonly onClose: () => void;
}

export default function DiscountShow({ discountId, onClose }: Props) {
  const [discount, setDiscount] = React.useState<Discount | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const showData = await getDiscountsByID(Number(discountId));
      setDiscount(showData.data[0]);
    } catch (showDataError) {
      setError(showDataError as Error);
    }
    setIsLoading(false);
  }, [discountId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  //It'll be use later, when the edit feature is implemented
  /*const handleDiscountEdit = React.useCallback(() => {
    navigate(`/employees/${discountId}/edit`);
  }, [navigate, discountId]);*/

  //It'll be use later, when the delete feature is implemented
  /*const handleDiscountDelete = React.useCallback(async () => {
    if (!discount) {
      return;
    }

    const confirmed = await dialogs.confirm(
      `Do you wish to delete ${discount.DISCOUNT_NAME}?`,
      {
        title: `Delete discount?`,
        severity: 'error',
        okText: 'Delete',
        cancelText: 'Cancel',
      },
    );

    if (confirmed) {
      setIsLoading(true);
      try {
        await deleteEmployee(Number(discountId));

        navigate('/employees');

        notifications.show('Discount deleted successfully.', {
          severity: 'success',
          autoHideDuration: 3000,
        });
      } catch (deleteError) {
        notifications.show(
          `Failed to delete discount. Reason:' ${(deleteError as Error).message}`,
          {
            severity: 'error',
            autoHideDuration: 3000,
          },
        );
      }
      setIsLoading(false);
    }
  }, [discount, dialogs, discountId, navigate, notifications]);*/

  const renderShow = React.useMemo(() => {
    if (isLoading) {
      return (
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
          }}
        >
          <CircularProgress />
        </Box>
      );
    }
    if (error) {
      return (
        <Box sx={{ flexGrow: 1 }}>
          <Alert severity="error">{error.message}</Alert>
        </Box>
      );
    }
    return discount ? (
    <Dialog open={discountId !== null} onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { bgcolor: 'background.paper', borderRadius: 2, display:'flex', alignItems:'center' } } }}>
      <DialogTitle sx={{ color: 'primary.dark', fontWeight: 700 }}>Descuento #{discount.ID_DISCOUNT}</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}
        {discount && (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <div>
              <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Nombre</Typography>
              <Typography>{discount.DISCOUNT_NAME}</Typography>
            </div>
            <div>
              <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Porcentaje</Typography>
              <Typography>{discount.DISCOUNT_PORCENTAGE}%</Typography>
            </div>
            <div style = {{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Fecha de inicio</Typography>
                <Typography>{discount.DISCOUNT_START_DATE}</Typography>
              </div>
              <div>
                <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Fecha de finalización</Typography>
                <Typography>{discount.DISCOUNT_FINISH_DATE}</Typography>
              </div>
            </div>
            <div>
                <Typography variant="overline" sx={{ color: 'primary.dark', fontWeight: 700 }}>Tipo de descuento</Typography>
                <Typography>{discount.TYPE}: {discount.NAME_FK_PRODUCT}</Typography>
              </div>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          sx={{ border: '1px solid', borderColor: 'primary.main', width:'25rem' }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
    ) : null;
  }, [
    isLoading,
    error,
    discount,
  ]);
  
  return (
    <Box>{renderShow}</Box>
  );
}
