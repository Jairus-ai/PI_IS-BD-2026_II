import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router';
import dayjs from 'dayjs';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import {
  getDiscounts,
  getDiscountsByName,
  getDiscountsByID
} from '../services/discountService';
import PageContainer from '../../../components/common/PageContainer';
import type { Discount } from '../types/discounts';

export default function EmployeeShow() {
  const { discountId } = useParams();
  const navigate = useNavigate();

  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [discount, setDiscount] = React.useState<Discount | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  const loadData = React.useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const showData = await getDiscountsByID(Number(discountId));

      console.log('Discount data:', showData); // Log the fetched data for debugging
      setDiscount(showData.data[0]);
    } catch (showDataError) {
      setError(showDataError as Error);
    }
    setIsLoading(false);
  }, [discountId]);

  React.useEffect(() => {
    loadData();
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

  const handleBack = React.useCallback(() => {
    navigate('/discounts');
  }, [navigate]);

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
            m: 1,
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
      <Box sx={{ flexGrow: 1, width: '100%' }}>
        <Grid container spacing={2} sx={{ width: '100%' }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Nombre</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {discount.DISCOUNT_NAME}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Porcentaje</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {discount.DISCOUNT_PORCENTAGE}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Fecha de inicio</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {discount.DISCOUNT_START_DATE}
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper sx={{ px: 2, py: 1 }}>
              <Typography variant="overline">Fecha de finalización</Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {discount.DISCOUNT_FINISH_DATE}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back
          </Button>
        </Stack>
      </Box>
    ) : null;
  }, [
    isLoading,
    error,
    discount,
    handleBack,
  ]);

  const pageTitle = `Discount ${discountId}`;

  return (
    <PageContainer
      title={pageTitle}
      breadcrumbs={[
        { title: 'Discounts', path: '//discounts' },
        { title: pageTitle },
      ]}
    >
      <Box sx={{ display: 'flex', flex: 1, width: '100%' }}>{renderShow}</Box>
    </PageContainer>
  );
}
