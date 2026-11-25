import { useMemo, useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import type { GridColDef } from '@mui/x-data-grid';
import { CrudPage } from '../../../components/crud/CrudPage';
import { ActionButton } from '../../../components/crud/ActionButton';
import { FilterField } from '../../../components/crud/FilterField';
import { useScreens } from '../hooks/useScreens';
import ScreenDetailDialog from '../components/ScreenDetailDialog';
import ScreenFormDialog from '../components/ScreenFormDialog';
import { SCREEN_TYPE_LABELS, type Screen, type ScreenType } from '../types/screens';
import {
  EMPTY_SCREEN_FILTERS,
  SCREEN_TYPE_OPTIONS,
  getLocationOptions,
  getScreenNameOptions,
  matchesScreenFilters,
  type FilterOption,
  type ScreenFilters
} from '../utils/screenFilters';

const PAGE_SIZE = 10;
const NO_SCREENS_MESSAGE = 'No hay salas registradas';
const NO_FILTER_RESULTS_MESSAGE = 'No se encontraron salas con los filtros aplicados';
const LOAD_ERROR_MESSAGE = 'No se pudieron cargar las salas';
const FIRST_PAGE = { page: 0, pageSize: PAGE_SIZE };
const getOptionValue = (option: FilterOption<string | number>) => option.value;
const getOptionLabel = (option: FilterOption<string | number>) => option.label;

export default function ScreenList() {
  const { screens, isLoadingScreens, screensError, refetchScreens } = useScreens();
  const [filters, setFilters] = useState<ScreenFilters>(EMPTY_SCREEN_FILTERS);
  const [paginationModel, setPaginationModel] = useState(FIRST_PAGE);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [screenForm, setScreenForm] = useState({ open: false, key: 0 });

  const filteredScreens = useMemo(
    () => screens.filter((screen: Screen) => matchesScreenFilters(screen, filters)),
    [screens, filters]
  );
  const nameOptions = useMemo(() => getScreenNameOptions(screens), [screens]);
  const locationOptions = useMemo(() => getLocationOptions(screens), [screens]);
  const pageStart = paginationModel.page * PAGE_SIZE;
  const pageScreens = filteredScreens.slice(pageStart, pageStart + PAGE_SIZE);

  const columns: GridColDef<Screen>[] = [
    {
      field: 'SCREEN_NAME',
      headerName: 'Sala',
      flex: 1,
      minWidth: 120
    },
    {
      field: 'LOCATION_NAME',
      headerName: 'Sucursal',
      flex: 2,
      minWidth: 180
    },
    {
      field: 'SCREEN_TYPE',
      headerName: 'Tipo de sala',
      flex: 1,
      minWidth: 140,
      valueFormatter: (value: ScreenType) => SCREEN_TYPE_LABELS[value]
    },
    {
      field: 'AMOUNT_SEATS',
      headerName: 'Capacidad',
      type: 'number',
      align: 'left',
      headerAlign: 'left',
      flex: 1,
      minWidth: 120
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
        <ActionButton
          key="show"
          label="Mostrar"
          onClick={() => setSelectedScreen(row)}
        />
      ]
    }
  ];

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters((previousFilters) => ({ ...previousFilters, [name]: value }));
    setPaginationModel(FIRST_PAGE);
  };

  const openForm = () => {
    setScreenForm((previousForm) => ({ open: true, key: previousForm.key + 1 }));
  };

  const closeForm = () => {
    setScreenForm((previousForm) => ({ ...previousForm, open: false }));
  };

  const clearFilters = () => {
    setFilters(EMPTY_SCREEN_FILTERS);
    setPaginationModel(FIRST_PAGE);
  };

  return (
    <CrudPage
      title="Salas"
      createLabel="Agregar sala"
      onCreate={openForm}
      error={screensError}
      errorMessage={LOAD_ERROR_MESSAGE}
      onRetry={() => void refetchScreens()}
      rows={pageScreens}
      rowCount={filteredScreens.length}
      getRowId={(row: Screen) => row.ID_SCREEN}
      columns={columns}
      loading={isLoadingScreens}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      hideFooter={filteredScreens.length <= PAGE_SIZE}
      noRowsLabel={screens.length === 0 ? NO_SCREENS_MESSAGE : NO_FILTER_RESULTS_MESSAGE}
      filters={
        <>
          <FilterField
            label="Sala"
            name="name"
            value={filters.name}
            onChange={handleFilterChange}
            itemList={nameOptions}
            getValue={getOptionValue}
            getLabel={getOptionLabel}
          />
          <FilterField
            label="Sucursal"
            name="locationId"
            value={filters.locationId}
            onChange={handleFilterChange}
            itemList={locationOptions}
            getValue={getOptionValue}
            getLabel={getOptionLabel}
            minWidth={220}
          />
          <FilterField
            label="Tipo de sala"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            itemList={SCREEN_TYPE_OPTIONS}
            getValue={getOptionValue}
            getLabel={getOptionLabel}
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
          <ScreenDetailDialog screen={selectedScreen} onClose={() => setSelectedScreen(null)} />
          <ScreenFormDialog key={screenForm.key} open={screenForm.open} onClose={closeForm} />
        </>
      }
    />
  );
}
