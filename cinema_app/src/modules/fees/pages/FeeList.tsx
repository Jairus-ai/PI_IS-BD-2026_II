import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import { DataGrid, GridActionsCellItem, gridClasses, type GridColDef } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import PageContainer from '../../../components/common/PageContainer';
import { useFees } from '../hooks/useFees';
import FeeDetailDialog from '../components/FeeDetailDialog';
import { FEE_TYPE_LABELS, formatFeeAmount, type Fee, type FeeType } from '../types/fees';

const PAGE_SIZE = 10;
const NO_FEES_MESSAGE = 'No hay tarifas registradas.';
const NO_FILTER_RESULTS_MESSAGE = 'No se encontraron tarifas con ese filtro';
const LOAD_ERROR_MESSAGE = 'No se pudieron cargar las tarifas.';

const ACTION_BUTTON_SX = {
  typography: 'body2',
  fontWeight: 500,
  color: 'primary.main',
  border: '1px solid',
  borderColor: 'primary.main',
  borderRadius: '4px',
  padding: '0.2rem',
  width: '5rem'
};

const GRID_SX = {
  [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
    outline: 'transparent'
  }
};

interface FeeFilters {
  type: FeeType | '';
  formatId: number | '';
}
const EMPTY_FILTERS: FeeFilters = { type: '', formatId: '' };

function matchesFilters(fee: Fee, filters: FeeFilters): boolean {
  const matchesType = filters.type === '' || fee.TYPE === filters.type;
  const matchesFormat = filters.formatId === '' || fee.ID_AUDIOVISUAL_FORMAT === filters.formatId;
  return matchesType && matchesFormat;
}

function getAudiovisualFormats(fees: Fee[]) {
  const formats = new Map<number, string>();
  for (const fee of fees) {
    formats.set(fee.ID_AUDIOVISUAL_FORMAT, fee.AUDIOVISUAL_FORMAT_NAME);
  }
  return [...formats.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export default function FeeList() {
  const { fees, isLoadingFees, feesError, refetchFees } = useFees();
  const [filters, setFilters] = useState<FeeFilters>(EMPTY_FILTERS);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const filteredFees = useMemo(() => fees.filter((fee: Fee) => matchesFilters(fee, filters)), [fees, filters]);
  const audiovisualFormats = useMemo(() => getAudiovisualFormats(fees), [fees]);
  const columns: GridColDef<Fee>[] = [
    {
      field: 'TYPE',
      headerName: 'Tipo',
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: FeeType) => FEE_TYPE_LABELS[value]
    },
    {
      field: 'AUDIOVISUAL_FORMAT_NAME',
      headerName: 'Formato audiovisual',
      flex: 2,
      minWidth: 220
    },
    {
      field: 'AMOUNT',
      headerName: 'Monto',
      type: 'number',
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: number) => formatFeeAmount(value)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      align: 'right',
      flex: 2,
      minWidth: 300,
      getActions: ({ row }) => [
        <GridActionsCellItem
          key="show"
          icon={<Box component="span" sx={ACTION_BUTTON_SX}>Mostrar</Box>}
          label="Mostrar"
          onClick={() => setSelectedFee(row)}
        />,
        <GridActionsCellItem
          key="edit"
          icon={<Box component="span" sx={ACTION_BUTTON_SX}>Editar</Box>}
          label="Editar"
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Box component="span" sx={ACTION_BUTTON_SX}>Eliminar</Box>}
          label="Eliminar"
        />
      ]
    }
  ];

  const handleTypeChange = (event: SelectChangeEvent<FeeType | ''>) => {
    setFilters((previousFilters) => ({ ...previousFilters, type: event.target.value }));
  };

  const handleFormatChange = (event: SelectChangeEvent<number | ''>) => {
    setFilters((previousFilters) => ({ ...previousFilters, formatId: event.target.value }));
  };

  const renderContent = () => {
    if (feesError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchFees()}>
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
        rows={filteredFees}
        getRowId={(row: Fee) => row.ID_FEE}
        columns={columns}
        loading={isLoadingFees}
        disableRowSelectionOnClick
        disableColumnMenu
        pageSizeOptions={[PAGE_SIZE]}
        initialState={{ pagination: { paginationModel: { pageSize: PAGE_SIZE } } }}
        hideFooter={filteredFees.length <= PAGE_SIZE}
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          noRowsLabel: fees.length === 0 ? NO_FEES_MESSAGE : NO_FILTER_RESULTS_MESSAGE
        }}
        sx={GRID_SX}
      />
    );
  };

  return (
    <PageContainer
      title="Tarifas"
      actions={
        <Button variant="contained">Agregar tarifa</Button>
      }
    >
      <Stack spacing={2} sx={{ flex: 1, width: '100%' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: { md: 'center' } }}>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="fee-type-filter-label">Tipo</InputLabel>
            <Select labelId="fee-type-filter-label" label="Tipo" value={filters.type} onChange={handleTypeChange}>
              <MenuItem value="">Todos los tipos</MenuItem>
              {Object.entries(FEE_TYPE_LABELS).map(([type, label]) => (
                <MenuItem key={type} value={type}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="fee-format-filter-label">Formato audiovisual</InputLabel>
            <Select
              labelId="fee-format-filter-label"
              label="Formato audiovisual"
              value={filters.formatId}
              onChange={handleFormatChange}
            >
              <MenuItem value="">Todos los formatos</MenuItem>
              {audiovisualFormats.map((format) => (
                <MenuItem key={format.id} value={format.id}>{format.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpiar filtros
          </Button>
        </Stack>
        {renderContent()}
      </Stack>
      <FeeDetailDialog fee={selectedFee} onClose={() => setSelectedFee(null)} />
    </PageContainer>
  );
}
