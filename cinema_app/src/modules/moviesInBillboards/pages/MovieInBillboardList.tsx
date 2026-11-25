import { useState, type ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { CrudPage } from '../../../components/crud/CrudPage';
import { Actions } from '../../../components/crud/Actions';
import { FilterField } from '../../../components/crud/FilterField';
import MovieInBillboardDetailDialog from '../components/MovieInBillboardDetailDialog';
import MovieInBillboardFormDialog from '../components/MovieInBillboardFormDialog';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import {
  useDeleteMovieInBillboard,
  useMovieInBillboardFilterOptions,
  useMoviesInBillboards
} from '../hooks/useMoviesInBillboards';
import { readServerMessage } from '../utils/movieInBillboardFormUtils';
import {
  formatBillboardDate,
  type LocationOption,
  type MovieInBillboard,
  type MovieInBillboardFilters
} from '../types/moviesInBillboards';
import type { Rating } from '../../movies/types/movies';

const PAGE_SIZE = 10;
const LOAD_ERROR_MESSAGE = 'No se pudieron cargar las películas en cartelera.';
const NO_MOVIES_IN_BILLBOARDS_MESSAGE = 'No hay películas en ninguna de las carteleras.';
const NO_FILTER_RESULTS_MESSAGE = 'No se encontraron resultados para la búsqueda.';
const DELETE_SUCCESS_MESSAGE = 'Película eliminada de la cartelera';
const DELETE_ERROR_MESSAGE = 'No se pudo eliminar la película de la cartelera. Intenta de nuevo.';

const MAX_MOVIE_NAME_LENGTH = 100;

const EMPTY_FILTERS: MovieInBillboardFilters = {
  locationId: '',
  ratingId: '',
  movieName: ''
};

const FIRST_PAGE = {
  page: 0,
  pageSize: PAGE_SIZE
};

export default function MovieInBillboardList() {
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [filters, setFilters] = useState<MovieInBillboardFilters>(EMPTY_FILTERS);
  const [paginationModel, setPaginationModel] = useState(FIRST_PAGE);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [movieInBillboardForm, setMovieInBillboardForm] = useState<{
    open: boolean;
    key: number;
    movieInBillboardId: number | null;
  }>({
    open: false,
    key: 0,
    movieInBillboardId: null
  });

  const {
    moviesInBillboards,
    totalMoviesInBillboards,
    isLoadingMoviesInBillboards,
    moviesInBillboardsError,
    refetchMoviesInBillboards
  } = useMoviesInBillboards(paginationModel.page + 1, filters);

  const { deleteMovieInBillboard } = useDeleteMovieInBillboard();

  const {
    ratings,
    locations
  } = useMovieInBillboardFilterOptions();

  const hasFilters = filters.locationId !== ''
    || filters.ratingId !== ''
    || filters.movieName.trim() !== '';

  const columns: GridColDef<MovieInBillboard>[] = [
    {
      field: 'MOVIE_TITLE',
      headerName: 'Película',
      flex: 1,
      minWidth: 120
    },
    {
      field: 'LOCATION_NAME',
      headerName: 'Sucursal',
      flex: 1,
      minWidth: 120
    },
    {
      field: 'OPENING_DATE',
      headerName: 'Fecha de inicio',
      width: 120,
      valueFormatter: (value: string) => formatBillboardDate(value)
    },
    {
      field: 'CLOSING_DATE',
      headerName: 'Fecha de fin',
      width: 120,
      valueFormatter: (value: string) => formatBillboardDate(value)
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Acciones',
      align: 'left',
      headerAlign: 'left',
      width: 340,
      getActions: Actions({
        onShow: (movieInBillboard: MovieInBillboard) => setSelectedId(movieInBillboard.ID_MOVIE_IN_BILLBOARD),
        onEdit: (movieInBillboard: MovieInBillboard) => openMovieInBillboardForm(movieInBillboard.ID_MOVIE_IN_BILLBOARD),
        onDelete: (movieInBillboard: MovieInBillboard) => void handleDelete(movieInBillboard)
      })
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

  const openMovieInBillboardForm = (movieInBillboardId: number | null) => {
    setMovieInBillboardForm((previousForm) => ({
      open: true,
      key: previousForm.key + 1,
      movieInBillboardId
    }));
  };

  const closeMovieInBillboardForm = () => {
    setMovieInBillboardForm((previousForm) => ({
      ...previousForm,
      open: false
    }));
  };

  const handleDelete = async (movieInBillboard: MovieInBillboard) => {
    const confirmed = await dialogs.confirm(
      `¿Desea eliminar "${movieInBillboard.MOVIE_TITLE}" de la cartelera de ${movieInBillboard.LOCATION_NAME}?`,
      {
        title: 'Eliminar película de cartelera',
        severity: 'error',
        okText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    );

    if (!confirmed)
      return;

    try {
      await deleteMovieInBillboard(movieInBillboard.ID_MOVIE_IN_BILLBOARD);

      if (moviesInBillboards.length === 1 && paginationModel.page > 0)
        setPaginationModel((previousModel) => ({
          ...previousModel,
          page: previousModel.page - 1
        }));

      notifications.show(DELETE_SUCCESS_MESSAGE, {
        severity: 'success',
        autoHideDuration: 3000
      });

    } catch (error) {
      notifications.show(readServerMessage(error, DELETE_ERROR_MESSAGE), {
        severity: 'error',
        autoHideDuration: 5000
      });
    }
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setPaginationModel(FIRST_PAGE);
  };

  return (
    <CrudPage
      title="Películas en cartelera"
      createLabel="Agregar película"
      onCreate={() => openMovieInBillboardForm(null)}
      error={moviesInBillboardsError}
      errorMessage={LOAD_ERROR_MESSAGE}
      onRetry={() => void refetchMoviesInBillboards()}
      rows={moviesInBillboards}
      rowCount={totalMoviesInBillboards}
      getRowId={(row: MovieInBillboard) => row.ID_MOVIE_IN_BILLBOARD}
      columns={columns}
      loading={isLoadingMoviesInBillboards}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      noRowsLabel={
        hasFilters
          ? NO_FILTER_RESULTS_MESSAGE
          : NO_MOVIES_IN_BILLBOARDS_MESSAGE
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
        <>
          <MovieInBillboardDetailDialog
            movieInBillboardId={selectedId}
            onClose={() => setSelectedId(null)}
          />
          <MovieInBillboardFormDialog
            key={movieInBillboardForm.key}
            open={movieInBillboardForm.open}
            movieInBillboardId={movieInBillboardForm.movieInBillboardId}
            onClose={closeMovieInBillboardForm}
          />
        </>
      }
    />
  );
}
