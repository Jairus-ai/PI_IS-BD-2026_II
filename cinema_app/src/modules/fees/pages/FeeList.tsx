import { useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import type { GridColDef } from '@mui/x-data-grid';
import { CrudPage } from '../../../components/crud/CrudPage';
import { Actions } from '../../../components/crud/Actions';
import { FilterField } from '../../../components/crud/FilterField';
import { useFees } from '../hooks/useFees';
import FeeDetailDialog from '../components/FeeDetailDialog';
import FeeFormDialog from '../components/FeeFormDialog';
import { FEE_TYPE_LABELS, formatFeeAmount, type Fee, type FeeType } from '../types/fees';

const PAGE_SIZE = 10;
const NO_FEES_MESSAGE = 'No hay tarifas registradas.';
const NO_FILTER_RESULTS_MESSAGE = 'No se encontraron tarifas con ese filtro';
const LOAD_ERROR_MESSAGE = 'No se pudieron cargar las tarifas.';

const FEE_TYPES = Object.entries(FEE_TYPE_LABELS).map(([type, label]) => ({ type, label }));

interface FeeFilters {
  type: FeeType | '';
  formatId: number | '';
}

const EMPTY_FILTERS: FeeFilters = { type: '', formatId: '' };
const FIRST_PAGE = { page: 0, pageSize: PAGE_SIZE };

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
  const [paginationModel, setPaginationModel] = useState(FIRST_PAGE);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [feeForm, setFeeForm] = useState<{ open: boolean; fee: Fee | null; key: number }>({
    open: false,
    fee: null,
    key: 0
  });

  const filteredFees = useMemo(() => fees.filter((fee: Fee) => matchesFilters(fee, filters)), [fees, filters]);
  const audiovisualFormats = useMemo(() => getAudiovisualFormats(fees), [fees]);

  //fees are filtered in the browser, so the current page is sliced here
  const pageStart = paginationModel.page * PAGE_SIZE;
  const pageFees = filteredFees.slice(pageStart, pageStart + PAGE_SIZE);

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
      align: 'left',
      headerAlign: 'left',
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: number) => formatFeeAmount(value)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      align: 'left',
      headerAlign: 'left',
      flex: 2,
      minWidth: 300,
      getActions: Actions({
        onShow: (fee: Fee) => setSelectedFee(fee),
        onEdit: (fee: Fee) => openForm(fee),
        onDelete: () => undefined
      })
    }
  ];

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((previousFilters) => ({ ...previousFilters, [name]: value }));
    setPaginationModel(FIRST_PAGE);
  };

  const openForm = (fee: Fee | null) => {
    setFeeForm((previousForm) => ({ open: true, fee, key: previousForm.key + 1 }));
  };

  const closeForm = () => {
    setFeeForm((previousForm) => ({ ...previousForm, open: false }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPaginationModel(FIRST_PAGE);
  };

  return (
    <CrudPage
      title="Tarifas"
      createLabel="Crear tarifa"
      onCreate={() => openForm(null)}
      error={feesError}
      errorMessage={LOAD_ERROR_MESSAGE}
      onRetry={() => void refetchFees()}
      rows={pageFees}
      rowCount={filteredFees.length}
      getRowId={(row: Fee) => row.ID_FEE}
      columns={columns}
      loading={isLoadingFees}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      hideFooter={filteredFees.length <= PAGE_SIZE}
      noRowsLabel={fees.length === 0 ? NO_FEES_MESSAGE : NO_FILTER_RESULTS_MESSAGE}
      filters={
        <>
          <FilterField
            label="Tipo"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            itemList={FEE_TYPES}
            getValue={(feeType: { type: string }) => feeType.type}
            getLabel={(feeType: { label: string }) => feeType.label}
          />
          <FilterField
            label="Formato audiovisual"
            name="formatId"
            value={filters.formatId}
            onChange={handleFilterChange}
            itemList={audiovisualFormats}
            getValue={(format: { id: number }) => format.id}
            getLabel={(format: { name: string }) => format.name}
            minWidth={260}
          />
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
          >
            Limpiar filtros
          </Button>
        </>
      }
      dialogs={
        <>
          <FeeDetailDialog fee={selectedFee} onClose={() => setSelectedFee(null)} />
          <FeeFormDialog key={feeForm.key} open={feeForm.open} fee={feeForm.fee} onClose={closeForm} />
        </>
      }
    />
  );
}
