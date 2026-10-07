import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
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
import DiscountShow from '../components/DiscountShow';
import DiscountCreate from '../components/DiscountCreate';
import RefreshIcon from '@mui/icons-material/Refresh';


export default function DiscountList() {
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [selectedDiscountId, setSelectedDiscountId] = React.useState<number | null>(null);

  // Uncomment delete and refetch once implemented.
  const { discounts, isLoadingDiscounts, discountsError, /*deleteDiscount,*/ refetchDiscounts } = useDiscounts();

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
          notifications.show('Descuento eliminado correctamente.', {
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
        minWidth: 200
      },
      {
        field: 'DISCOUNT_PORCENTAGE',
        headerName: 'Porcentaje',
        maxWidth: 100,
        minWidth: 100,
        type: 'number',
      },
      {
        field: 'DISCOUNT_STATE',
        headerName: 'Estado',
        maxWidth: 100,
        minWidth: 100,
        type: 'string',
      },
      {
        field: 'actions',
        type: 'actions',
        align: 'right',
        headerName: 'Acciones',
        flex: 1,
        minWidth: 220,
        getActions: ({ row }: { row: Discount }) => [
          <GridActionsCellItem
            key="show"
            icon={<Box component="span" sx={{fontSize: '1rem', fontWeight: 500, color: 'primary.main', border: '1px solid', borderColor: 'primary.main', borderRadius: '4px', padding: '0.2rem', width: '5rem'}}>Mostrar</Box>}
            label="Mostrar"
            onClick={() => setSelectedDiscountId(row.ID_DISCOUNT)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="edit"
            icon={<Box component="span" sx={{fontSize: '1rem', fontWeight: 500, color: 'secondary.main', border: '1px solid', borderColor: 'secondary.main', borderRadius: '4px', padding: '0.2rem', width: '5rem'}}>Editar</Box>}
            label="Editar"
            onClick={() => navigate(`/discounts/${row.ID_DISCOUNT}/edit`)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<Box component="span" sx={{fontSize: '1rem', fontWeight: 500, color: 'error.main', border: '1px solid', borderColor: 'error.main', borderRadius: '4px', padding: '0.2rem', width: '5rem'}}>Eliminar</Box>}
            label="Eliminar"
            onClick={handleRowDelete(row)}
            showInMenu={false}
          />,
        ],
      },
    ],
    [navigate, handleRowDelete],
  );

  const [createOpen, setCreateOpen] = React.useState(false);

  return (
    <PageContainer
      title="Descuentos"
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={() => void refetchDiscounts()}>
                <RefreshIcon />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
          >
            Añadir Descuento
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
            initialState={{
              pagination: { paginationModel: { pageSize: 15 } },
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
            }}
          />
        )}
        <DiscountShow discountId={selectedDiscountId} onClose={() => setSelectedDiscountId(null)}/>
          <DiscountCreate
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={refetchDiscounts}
          />
      </Box>
    </PageContainer>
  );
}
