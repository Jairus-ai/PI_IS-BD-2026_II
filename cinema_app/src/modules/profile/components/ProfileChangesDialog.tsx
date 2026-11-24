import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CrudDialog } from '../../../components/crud/CrudDialog';
import type { ProfileChange } from '../utils/profileForm';

interface ProfileChangesDialogProps {
  readonly open: boolean;
  readonly changes: ProfileChange[];
  readonly isSaving: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

const EMPTY_VALUE = '(vacío)';

export default function ProfileChangesDialog({ open, changes, isSaving, onCancel, onConfirm }: ProfileChangesDialogProps) {
  return (
    <CrudDialog
      open={open}
      title="¿Desea guardar los siguientes cambios?"
      onClose={onCancel}
      actions={
        <>
          <Button onClick={onCancel} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" disableElevation onClick={onConfirm} disabled={isSaving}>
            Confirmar
          </Button>
        </>
      }
    >
      <Stack spacing={1.5}>
        {changes.map((change) => (
          <Typography key={change.field}>
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {change.label}:
            </Typography>{' '}
            {change.previous || EMPTY_VALUE} → {change.current || EMPTY_VALUE}
          </Typography>
        ))}
      </Stack>
    </CrudDialog>
  );
}
