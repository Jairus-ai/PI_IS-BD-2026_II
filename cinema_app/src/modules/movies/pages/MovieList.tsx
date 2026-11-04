import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useMovies } from '../hooks/useMovies';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import type { Movie } from '../types/movies';
import MovieDetailDialog from '../components/MovieDetailDialog';
import MovieFormDialog from '../components/MovieFormDialog';
import { Actions } from '../../../components/crud/Actions';
import { FilterField } from '../../../components/crud/FilterField';
import { CrudPage } from '../../../components/crud/CrudPage';

const emptyFilters = {
  name: '',
  genreId: '',
  languageCode: '',
  ratingId: '',
  audiovisualFormatId: '',
};

export default function MovieList() {
  const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
  const serverPage = paginationModel.page + 1;

  const [filters, setFilters] = React.useState(emptyFilters);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [formMovieId, setFormMovieId] = React.useState<number | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const dialogs = useDialogs();
  const notifications = useNotifications();

  const {
    movies,
    totalMovies,
    isLoadingMovies,
    moviesError,
    deleteMovie,
    genres,
    languages,
    ratings,
    formats,
  } = useMovies(serverPage, null, filters);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  }

  const openCreate = () => {
    setFormMovieId(null);
    setFormOpen(true);
  };

  const openEdit = (id: number) => {
    setFormMovieId(id);
    setFormOpen(true);
  };

  const handleRowDelete = React.useCallback(
    (movie: Movie) => async () => {
      const confirmed = await dialogs.confirm(
        `¿Desea eliminar la película "${movie.MOVIE_TITLE}"?`,
        {
          title: 'Eliminar película',
          severity: 'error',
          okText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      );

      if (confirmed) {
        try {
          await deleteMovie({ id: movie.ID_MOVIE });
          notifications.show('Película eliminada correctamente.', {
            severity: 'success',
            autoHideDuration: 5000,
          });
        } catch (error) {
          notifications.show(
            `Error al eliminar la película: ${(error as Error).message}`,
            {
              severity: 'error',
              autoHideDuration: 5000,
            },
          );
        }
      }
    },
    [dialogs, deleteMovie, notifications],
  );

  const columns = React.useMemo<GridColDef[]>(
    () => [
      {
        field: 'MOVIE_TITLE',
        headerName: 'Título',
        flex: 1,
        minWidth: 200,
      },
      {
        field: 'GENRES',
        headerName: 'Género',
        width: 200,
        valueGetter: (value, row: Movie) =>
          Array.isArray(row.GENRES)
            ? row.GENRES.join(', ')
            : value || 'N/A',
      },
      {
        field: 'PUBLISHING_YEAR',
        headerName: 'Año de Publicación',
        width: 160,
        valueFormatter: (value: number) => `${value ?? ''}`,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Acciones',
        flex: 1,
        minWidth: 220,
        align: 'right',
        getActions: Actions({
          onShow: (movie: any) => setSelectedId(movie.ID_MOVIE),
          onEdit: (movie: any) => openEdit(movie.ID_MOVIE),
          onDelete: (movie: any) => handleRowDelete(movie),
        }),
      },
    ],
    [handleRowDelete],
  );

  return (
    <CrudPage
      title="Películas"
      createLabel="Crear Película"
      onCreate={openCreate}
      error={moviesError}
      rows={movies}
      rowCount={totalMovies}
      getRowId={(row: Movie) => row.ID_MOVIE}
      columns={columns}
      loading={isLoadingMovies}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      filters={
        <>
          <TextField
            label="Buscar por nombre"
            name="name"
            value={filters.name}
            onChange={handleChange}
            size="small"
          />
          <FilterField
            label="Género"
            name="genreId"
            value={filters.genreId}
            onChange={handleChange}
            itemList={genres}
            getValue={(genre: any) => genre.ID_GENRE}
            getLabel={(genre: any) => genre.GENRE_NAME}
          />
          <FilterField
            label="Idioma"
            name="languageCode"
            value={filters.languageCode}
            onChange={handleChange}
            itemList={languages}
            getValue={(language: any) => language.ISO_CODE}
            getLabel={(language: any) => language.LANGUAGE_NAME}
          />
          <FilterField
            label="Formato audiovisual"
            name="audiovisualFormatId"
            value={filters.audiovisualFormatId}
            onChange={handleChange}
            itemList={formats}
            getValue={(format: any) => format.ID_AUDIOVISUAL_FORMAT}
            getLabel={(format: any) => `${format.VIDEO_FORMAT_NAME} ${format.AUDIO_FORMAT_NAME}`}
            minWidth={220}
          />
          <FilterField
            label="Clasificación"
            name="ratingId"
            value={filters.ratingId}
            onChange={handleChange}
            itemList={ratings}
            getValue={(rating: any) => rating.ID_RATING}
            getLabel={(rating: any) => rating.RATING_CODE}
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
          <MovieDetailDialog
            movieId={selectedId}
            open={selectedId !== null}
            onClose={() => setSelectedId(null)}
          />
          <MovieFormDialog
            movieId={formMovieId}
            open={formOpen}
            onClose={() => {
              setFormOpen(false);
              setFormMovieId(null);
            }}
          />
        </>
      }
    />
  );
}