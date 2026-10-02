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
import { useNavigate } from 'react-router';
import { useMovies } from '../hooks/useMovies';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import PageContainer from '../../../components/common/PageContainer';
import type { Movie } from '../types/movies';

export default function MovieList() {
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  // TODO(Jesus): Uncomment delete and refetch once implemented.
  const { movies, isLoadingMovies, moviesError, /* deleteMovie, refetchMovies */ } = useMovies();

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
            icon={<span style={{ fontWeight: 500 }}>Mostrar</span>}
            label="Mostrar"
            onClick={() => navigate(`/movies/${row.ID_MOVIE}`)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="edit"
            icon={<span style={{ fontWeight: 500 }}>Editar</span>}
            label="Editar"
            onClick={() => navigate(`/movies/${row.ID_MOVIE}/edit`)}
            showInMenu={false}
          />,
          <GridActionsCellItem
            key="delete"
            icon={<span style={{ fontWeight: 500, color: '#d32f2f' }}>Eliminar</span>}
            label="Eliminar"
            onClick={handleRowDelete(row)}
            showInMenu={false}
          />,
        ],
      },
    ],
    [navigate, handleRowDelete],
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
            onClick={() => navigate('/movies/new')}
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
            rows={Array.isArray(movies) ? movies : []}
            getRowId={(row: Movie) => row.ID_MOVIE}
            columns={columns}
            loading={isLoadingMovies}
            disableRowSelectionOnClick
            pageSizeOptions={[5, 10, 25]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            sx={{
              [`& .${gridClasses.columnHeader}, & .${gridClasses.cell}`]: {
                outline: 'transparent',
              },
            }}
          />
        )}
      </Box>
    </PageContainer>
  );
}
