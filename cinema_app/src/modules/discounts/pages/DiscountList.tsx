import * as React from 'react';
import {useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {
  DataGrid,
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
import {deleteDiscount} from '../services/discountService';
import DiscountEdit from '../components/DiscountEdit';
import { Actions } from '../../../components/crud/Actions';
import TextField from '@mui/material/TextField';

interface DiscountFilters {
  name: string;
}

export default function DiscountList() {
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [selectedDiscountId, setSelectedDiscountId] = React.useState<number | null>(null);

  const { discounts, isLoadingDiscounts, discountsError, refetchDiscounts } = useDiscounts();

  const handleRowDelete = React.useCallback(
    async(discount: Discount) => {
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
          await deleteDiscount(discount.ID_DISCOUNT);
          notifications.show('Descuento eliminado correctamente.', {
            severity: 'success',
            autoHideDuration: 3000,
          });
          await refetchDiscounts();
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
    [dialogs, notifications, refetchDiscounts],
  );

  const [EditOpen, setModifyOpen] = React.useState(false);
 const [idDiscountToEdit, setIdDiscountToModify] = React.useState<number | null>(null);

  function openModify(row:Discount)
  {
    setIdDiscountToModify( Number(row.ID_DISCOUNT));
    setModifyOpen(true);
  }

  function closeEdit()
  {
    setIdDiscountToModify(null);
    setModifyOpen(false);
  }

  const [filters, setFilters] = useState<DiscountFilters>({
    name: ''
  });

  function handleChange(event:any) {
    const { name, value } = event.target;

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }));
  }

  const filteredDiscounts = React.useMemo(() => {
  if (!Array.isArray(discounts?.data)) return []; 

  return discounts.data.filter((discount: Discount) =>
    discount.DISCOUNT_NAME
      ?.toLowerCase()
      .includes(filters.name.toLowerCase())
  );
}, [discounts?.data, filters.name]);

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'DISCOUNT_NAME',
        headerName: 'Nombre',
        flex: 1,
        align:'left',
      },
      {
        field: 'DISCOUNT_PORCENTAGE',
        headerName: 'Porcentaje',
        maxWidth: 100,
        minWidth: 100,
        type: 'number',
        align:'left'
      },
      {
        field: 'DISCOUNT_STATE',
        headerName: 'Estado',
        maxWidth: 100,
        minWidth: 100,
        type: 'string',
        align:'left'
      },
      {
        field: 'actions',
        type: 'actions',
        align:'left',
        headerName: 'Acciones',
        flex: 1,
        getActions: Actions({
          onShow: (discount: any) => {setSelectedDiscountId(discount.ID_DISCOUNT)},
          onEdit: (discount: any) => {openModify(discount)},
          onDelete: (discount: any) => {void handleRowDelete(discount)},
        })
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
          <Button
            variant="contained"
            onClick={() => setCreateOpen(true)}
          >
            Crear Descuento
          </Button>
        </Stack>
      }
    >
      <Box sx={{ flex: 1, width: '100%', marginLeft:'5px'}}>
        <TextField
          label="Buscar por nombre"
          name="name"
          value={filters.name}
          onChange={handleChange}
          size="small"
         />
        {discountsError ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{(discountsError as Error).message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={filteredDiscounts}
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
              marginTop:'15px',
            }}
          />
        )}
        <DiscountShow discountId={selectedDiscountId} onClose={() => setSelectedDiscountId(null)}/>
        <DiscountCreate
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={refetchDiscounts}
        />
        <DiscountEdit
          open={EditOpen}
          onClose={() => closeEdit()}
          onEdited={refetchDiscounts}
          discountID = {idDiscountToEdit}
        />
      </Box>
    </PageContainer>
  );
}
