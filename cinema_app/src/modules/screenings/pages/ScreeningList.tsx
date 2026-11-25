import { useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { CrudPage } from '../../../components/crud/CrudPage';
import { ActionButton } from '../../../components/crud/ActionButton';
import { FilterField } from '../../../components/crud/FilterField';
import ScreeningDetailDialog from '../components/ScreeningDetailDialog';
import {
  useScreeningFilterOptions,
  useScreenings,
  type LocationOption
} from '../hooks/useScreenings';
import type {
  Screening,
  ScreeningFilters
} from '../types/screenings';
import type {
  AudiovisualFormat,
  Rating
} from '../../movies/types/movies';

const PAGE_SIZE = 10;
const LOAD_ERROR_MESSAGE = 'No se pudieron cargar las proyecciones.';
const NO_SCREENINGS_MESSAGE = 'No hay proyecciones para las películas en cartelera';
const NO_FILTER_RESULTS_MESSAGE = 'No hay proyecciones para la películas en carteleras';

const MAX_MOVIE_NAME_LENGTH = 100;

const EMPTY_FILTERS: ScreeningFilters = {
  locationId: '',
  audiovisualFormatId: '',
  ratingId: '',
  movieName: ''
};

const FIRST_PAGE = {
  page: 0,
  pageSize: PAGE_SIZE
};

export default function ScreeningList() {
  const [filters, setFilters] = useState<ScreeningFilters>(EMPTY_FILTERS);
  const [paginationModel, setPaginationModel] = useState(FIRST_PAGE);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const {
    screenings,
    totalScreenings,
    isLoadingScreenings,
    screeningsError,
    refetchScreenings
  } = useScreenings(paginationModel.page + 1, filters);

  const {
    locations,
    formats,
    ratings
  } = useScreeningFilterOptions();

  const hasFilters = filters.locationId !== ''
    || filters.audiovisualFormatId !== ''
    || filters.ratingId !== ''
    || filters.movieName.trim() !== '';

  const columns: GridColDef<Screening>[] = [
    {
      field: 'LOCATION_NAME',
      headerName: 'Sucursal',
      flex: 1,
      minWidth: 120
    },
    {
      field: 'SCREEN_NUMBER',
      headerName: 'Sala',
      width: 80
    },
    {
      field: 'MOVIE_TITLE',
      headerName: 'Película',
      flex: 1,
      minWidth: 120
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      align: 'left',
      headerAlign: 'left',
      width: 340,
      getActions: ({ row }) => [
        <ActionButton
          key="show"
          label="Mostrar"
          onClick={() => setSelectedId(row.ID_SCREENING)}
        />
      ]
    }
  ];

  const handleFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setFilters((previousFilters) => ({
      ...previousFilters,
      [name]: value
    }));
    setPaginationModel(FIRST_PAGE);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPaginationModel(FIRST_PAGE);
  };

  return (
    <CrudPage
      title="Proyecciones"
      error={screeningsError}
      errorMessage={LOAD_ERROR_MESSAGE}
      onRetry={() => void refetchScreenings()}
      rows={screenings}
      rowCount={totalScreenings}
      getRowId={(row: Screening) => row.ID_SCREENING}
      columns={columns}
      loading={isLoadingScreenings}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      noRowsLabel={
        hasFilters
          ? NO_FILTER_RESULTS_MESSAGE
          : NO_SCREENINGS_MESSAGE
      }
      filters={
        <>
          <TextField
            label="Buscar por nombre"
            name="movieName"
            value={filters.movieName}
            onChange={handleFilterChange}
            size="small"
            slotProps={{ htmlInput: { maxLength: MAX_MOVIE_NAME_LENGTH } }}
          />
          <FilterField
            label="Sucursal"
            name="locationId"
            value={filters.locationId}
            onChange={handleFilterChange}
            itemList={locations}
            getValue={(location: LocationOption) => location.ID_LOCATION}
            getLabel={(location: LocationOption) => location.LOCATION_NAME}
          />
          <FilterField
            label="Formato"
            name="audiovisualFormatId"
            value={filters.audiovisualFormatId}
            onChange={handleFilterChange}
            itemList={formats}
            getValue={(format: AudiovisualFormat) => format.ID_AUDIOVISUAL_FORMAT}
            getLabel={(format: AudiovisualFormat) => `${format.VIDEO_FORMAT_NAME} + ${format.AUDIO_FORMAT_NAME}`}
          />
          <FilterField
            label="Clasificación"
            name="ratingId"
            value={filters.ratingId}
            onChange={handleFilterChange}
            itemList={ratings}
            getValue={(rating: Rating) => rating.ID_RATING}
            getLabel={(rating: Rating) => rating.RATING_CODE}
          />
          <Button
            variant="outlined"
            onClick={clearFilters}
            sx={{
              whiteSpace: 'nowrap',
              minWidth: 'max-content'
            }}
          >
            Limpiar filtros
          </Button>
        </>
      }
      dialogs={
        <ScreeningDetailDialog
          screeningId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      }
    />
  );
}
