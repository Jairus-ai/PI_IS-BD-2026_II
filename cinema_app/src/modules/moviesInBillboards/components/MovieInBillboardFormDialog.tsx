import Button from '@mui/material/Button';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import { useMovieInBillboardForm } from '../hooks/useMovieInBillboardForm';
import MovieInBillboardFormFields from './MovieInBillboardFormFields';

const FORM_ID = 'movie-in-billboard-form';

interface MovieInBillboardFormDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly movieInBillboardId?: number | null;
}

export default function MovieInBillboardFormDialog({
  open,
  onClose,
  movieInBillboardId = null
}: MovieInBillboardFormDialogProps) {
  const form = useMovieInBillboardForm({
    movieInBillboardId,
    open,
    onClose
  });

  const title = form.isCreate
    ? 'Agregar película a cartelera'
    : 'Modificar película en cartelera';
  const submitLabel = form.isCreate
    ? 'Agregar'
    : 'Guardar';
  const savingLabel = form.isCreate
    ? 'Agregando…'
    : 'Guardando…';

  return (
    <CrudDialog
      open={open}
      title={title}
      onClose={form.handleClose}
      loading={form.loading}
      actions={
        <>
          <Button onClick={form.handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            variant="contained"
            disabled={!form.canSubmit}
          >
            {
              form.saving
                ? savingLabel
                : submitLabel
            }
          </Button>
        </>
      }
    >
      <MovieInBillboardFormFields
        form={form}
        formId={FORM_ID}
      />
    </CrudDialog>
  );
}
