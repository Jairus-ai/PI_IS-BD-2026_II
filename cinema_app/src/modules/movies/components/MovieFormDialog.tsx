import * as React from 'react';
import Button from '@mui/material/Button';
import { useMovieForm } from '../hooks/useMovieForm';
import MovieFormFields from './MovieFormFields';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface MovieFormDialogProps {
  readonly movieId: number | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSaved?: () => void;
}

export default function MovieFormDialog({
  movieId,
  open,
  onClose,
  onSaved,
}: MovieFormDialogProps) {
  const form = useMovieForm({ movieId, open, onClose, onSaved });

  const title = form.isCreate ? 'Crear película' : 'Editar película';
  const isLoading = form.loading || (!form.isCreate && !form.detail);

  return (
    <CrudDialog
      open={open}
      title={title}
      onClose={onClose}
      loading={isLoading}
      actions={
        <>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="movie-form"
            variant="contained"
            disabled={form.saving}
          >
            {form.isCreate
              ? 'Crear'
              : 'Guardar'
            }
          </Button>
        </>
      }
    >
      <MovieFormFields
        form={form}
        formId="movie-form"
      />
    </CrudDialog>
  );
}