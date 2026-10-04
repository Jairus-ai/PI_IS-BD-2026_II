import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  gridClasses,
} from '@mui/x-data-grid';
import { useNavigate } from 'react-router';
import { useDiscounts } from '../hooks/useDiscounts';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import PageContainer from '../../../components/common/PageContainer';
import type { Discount } from '../types/discounts';

export default function DiscountList() {
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  // Uncomment delete and refetch once implemented.
  const { discounts, isLoadingDiscounts, discountsError, /* deleteDiscount, refetchDiscounts */ } = useDiscounts();

  const handleRowDelete = React.useCallback(
    (discount: Discount) => async () => {
      const confirmed = await dialogs.confirm(
        `¿Desea eliminar el descuento "${discount.DISCOUNT_NAME}"?`,
        {
          title: 'Eliminar descuento',
          severity: 'error',
          okText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      );

      if (confirmed) {
        try {
          // await deleteDiscount(discount.ID_DISCOUNTS);
          notifications.show('Descuent eliminado correctamente.', {
            severity: 'success',
            autoHideDuration: 3000,
          });
        } catch (error) {
          notifications.show(
            `Error al eliminar el descuento: ${(error as Error).message}`,
            {
              severity: 'error',
              autoHideDuration: 3000,
            },
          );
        }
      }
    },
    [dialogs, /* deleteDiscount, */ notifications],
  );

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'DISCOUNT_NAME',
        headerName: 'Nombre',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'DISCOUNT_PORCENTAGE',
        headerName: 'Porcentaje de descuento',
        width: 160,
        type: 'number',
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Acciones',
        flex: 1,
        minWidth: 220,
        align: 'right',
        getActions: ({ row }: { row: Discount }) => [
          <GridActionsCellItem
            key="show"
            icon={<span style={{ fontWeight: 500 }}>Mostrar</span>}
            label="Mostrar"
            onClick={() => navigate(`/discounts/${row.ID_DISCOUNT}`)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="edit"
            icon={<span style={{ fontWeight: 500 }}>Editar</span>}
            label="Editar"
            onClick={() => navigate(`/discounts/${row.ID_DISCOUNT}/edit`)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<span style={{ fontWeight: 500, color: '#d32f2f' }}>Eliminar</span>}
            label="Eliminar"
            onClick={handleRowDelete(row)}
            showInMenu={false}
          />,
        ],
      },
    ],
    [navigate, handleRowDelete],
  );

  return (
    <PageContainer
      title="Descuentos"
      breadcrumbs={[{ title: 'Descuentos' }]}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button variant="outlined" size="small" /* onClick={() => refetchMovies()} */>
            Recargar
          </Button>
          <Button
            variant="contained"
            onClick={() => navigate('/discounts/new')}
          >
            Crear Película
          </Button>
        </Stack>
      }
    >
      <Box sx={{ flex: 1, width: '100%' }}>
        {discountsError ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{(discountsError as Error).message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={Array.isArray(discounts?.data) ? discounts.data : []}
            getRowId={(row: Discount) => row.ID_DISCOUNT}
            columns={columns}
            loading={isLoadingDiscounts}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
