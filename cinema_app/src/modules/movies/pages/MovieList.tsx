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
import { useMovies } from '../hooks/useMovies';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import PageContainer from '../../../components/common/PageContainer';
import type { Movie } from '../types/movies';
import MovieDetailDialog from '../components/MovieDetailDialog';
import MovieFormDialog from '../components/MovieFormDialog';

export default function MovieList() {
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
  const serverPage = paginationModel.page + 1;

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [formMovieId, setFormMovieId] = React.useState<number | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const openCreate = () => {
    setFormMovieId(null);
    setFormOpen(true);
  };

  const openEdit = (id: number) => {
    setFormMovieId(id);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormMovieId(null);
  };

  // TODO(Jesus): Uncomment delete and refetch once implemented.
  const { movies, totalMovies, isLoadingMovies, moviesError, /* deleteMovie, refetchMovies */ } = useMovies(serverPage);

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
          // await deleteMovie(movie.ID_MOVIE);
          notifications.show('Película eliminada correctamente.', {
            severity: 'success',
            autoHideDuration: 3000,
          });
        } catch (error) {
          notifications.show(
            `Error al eliminar la película: ${(error as Error).message}`,
            {
              severity: 'error',
              autoHideDuration: 3000,
            },
          );
        }
      }
    },
    [dialogs, /* deleteMovie, */ notifications],
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
          Array.isArray(row.GENRES) ? row.GENRES.join(', ') : value || 'N/A',
      },
      {
        field: 'PUBLISHING_YEAR',
        headerName: 'Año de Publicación',
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
        getActions: ({ row }: { row: Movie }) => [
          <GridActionsCellItem
            key="show"
            icon={<Box component="span" sx={{ fontWeight: 500, color: 'primary.main' }}>Mostrar</Box>}
            label="Mostrar"
            onClick={() => setSelectedId(row.ID_MOVIE)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="edit"
            icon={<Box component="span" sx={{ fontWeight: 500, color: 'secondary.main' }}>Editar</Box>}
            label="Editar"
            onClick={() => openEdit(row.ID_MOVIE)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<Box component="span" sx={{ fontWeight: 500, color: 'error.main' }}>Eliminar</Box>}
            label="Eliminar"
            onClick={handleRowDelete(row)}
            showInMenu={false}
          />,
        ],
      },
    ],
    [handleRowDelete],
  );

  return (
    <PageContainer
      title="Películas"
      breadcrumbs={[{ title: 'Películas' }]}
      actions={
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Button variant="outlined" size="small" /* onClick={() => refetchMovies()} */>
            Recargar
          </Button>
          <Button
            variant="contained"
            onClick={() => openCreate()}
          >
            Crear Película
          </Button>
        </Stack>
      }
    >
      <Box sx={{ flex: 1, width: '100%' }}>
        {moviesError ? (
          <Box sx={{ flexGrow: 1 }}>
            <Alert severity="error">{(moviesError as Error).message}</Alert>
          </Box>
        ) : (
          <DataGrid
            rows={movies}
            rowCount={totalMovies}
            getRowId={(row: Movie) => row.ID_MOVIE}
            columns={columns}
            loading={isLoadingMovies}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10]}
            disableRowSelectionOnClick
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0px 5px 15px rgba(0, 0, 0, 0.05), 0px 15px 35px -5px rgba(0, 0, 0, 0.05)',
              [`& .${gridClasses.columnHeader}`]: {
                bgcolor: 'background.default',
              },
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
            }}
          />
        )}
        <MovieDetailDialog movieId={selectedId} open={selectedId !== null} onClose={() => setSelectedId(null)} />
        <MovieFormDialog movieId={formMovieId} open={formOpen} onClose={closeForm} />
      </Box>
    </PageContainer>
  );
}
