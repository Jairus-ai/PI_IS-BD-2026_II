import { useMemo, useState, type ChangeEvent } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { DataGrid, GridActionsCellItem, gridClasses, type GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import PageContainer from '../../../components/common/PageContainer';
import { usePurchaseHistory } from '../hooks/usePurchases';
import PurchaseDetailDialog from '../components/PurchaseDetailDialog';
import { formatAmount, getMovieTitle, type Purchase } from '../types/purchases';

const PAGE_SIZE = 10;
const NO_PURCHASES_MESSAGE = 'Aún no has realizado compras';
const LOAD_ERROR_MESSAGE = 'No se pudo cargar el historial de pagos.';

const ACTION_BUTTON_SX = {
  typography: 'body2',
  color: 'primary.main',
  border: '1px solid',
  borderColor: 'primary.main',
  borderRadius: '8px',
  padding: '0.2rem',
  width: '5rem'
};

const GRID_SX = {
  [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
    outline: 'transparent'
  }
};

function normalizeText(text: string): string {
  return text.normalize('NFD').replaceAll(/[̀-ͯ]/g, '').toLowerCase();
}

function getNoResultsMessage(search: string): string {
  return `No se encuentra una compra relacionada a la película "${search}"`;
}

export default function PurchaseHistory() {
  const { purchases, isLoadingPurchases, purchasesError, refetchPurchases } = usePurchaseHistory();
  const [search, setSearch] = useState('');
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);

  const trimmedSearch = search.trim();
  const filteredPurchases = useMemo(() => {
    const normalizedSearch = normalizeText(trimmedSearch);
    return purchases.filter((purchase: Purchase) =>
      normalizeText(getMovieTitle(purchase)).includes(normalizedSearch)
    );
  }, [purchases, trimmedSearch]);

  const columns: GridColDef<Purchase>[] = [
    {
      field: 'ID_RECEIPT',
      headerName: 'Número de compra',
      flex: 1,
      minWidth: 160
    },
    {
      field: 'MOVIE_TITLE',
      headerName: 'Película',
      flex: 2,
      minWidth: 220,
      valueGetter: (_value, row) => getMovieTitle(row)
    },
    {
      field: 'TOTAL_AMOUNT',
      headerName: 'Monto',
      type: 'number',
      align: 'left',
      headerAlign: 'left',
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: number) => formatAmount(value)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      align: 'left',
      headerAlign: 'left',
      flex: 1,
      minWidth: 140,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="show"
          icon={<Box component="span" sx={ACTION_BUTTON_SX}>Mostrar</Box>}
          label="Mostrar"
          onClick={() => setSelectedPurchaseId(row.ID_RECEIPT)}
        />
      ]
    }
  ];

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const renderContent = () => {
    if (purchasesError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchPurchases()}>
              Reintentar
            </Button>
          }
        >
          {LOAD_ERROR_MESSAGE}
        </Alert>
      );
    }

    return (
      <DataGrid
        rows={filteredPurchases}
        getRowId={(row: Purchase) => row.ID_RECEIPT}
        columns={columns}
        loading={isLoadingPurchases}
        onRowClick={({ row }) => setSelectedPurchaseId(row.ID_RECEIPT)}
        disableRowSelectionOnClick
        disableColumnMenu
        pageSizeOptions={[PAGE_SIZE]}
        initialState={{ pagination: { paginationModel: { pageSize: PAGE_SIZE } } }}
        hideFooter={filteredPurchases.length <= PAGE_SIZE}
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          noRowsLabel: purchases.length === 0 ? NO_PURCHASES_MESSAGE : getNoResultsMessage(trimmedSearch)
        }}
        sx={{ ...GRID_SX, cursor: 'pointer' }}
      />
    );
  };

  return (
    <PageContainer title="Historial de pagos">
      <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
        <TextField
          label="Buscar por película"
          value={search}
          onChange={handleSearchChange}
          size="small"
          sx={{ maxWidth: 360 }}
        />
        {renderContent()}
      </Stack>
      <PurchaseDetailDialog purchaseId={selectedPurchaseId} onClose={() => setSelectedPurchaseId(null)} />
    </PageContainer>
  );
}
