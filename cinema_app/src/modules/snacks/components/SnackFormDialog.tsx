import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useSnackForm } from '../hooks/useSnacksForm';
import SnackFormFields from './SnackFormFields';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface SnackFormDialogProps {
    readonly snackId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSaved?: () => void;
}

const FORM_ID = 'snack-form';

export default function SnackFormDialog({
    snackId,
    open,
    onClose,
    onSaved,
}: SnackFormDialogProps) {
    const form = useSnackForm({ snackId, open, onClose, onSaved });

    const title = form.isCreate ? 'Crear snack' : 'Editar snack';

    return (
        <CrudDialog
            open={open}
            title={title}
            onClose={onClose}
            loading={form.loading}
            actions={
                <>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Tooltip
                        title={
                            form.isValid
                                ? ''
                                : 'Completa todos los campos obligatorios correctamente'
                        }
                    >
                        <span>
                            <Button
                                type="submit"
                                form={FORM_ID}
                                variant="contained"
                            >
                                {form.isCreate ? 'Crear' : 'Guardar'}
                            </Button>
                        </span>
                    </Tooltip>
                </>
            }
        >
            <SnackFormFields form={form} formId={FORM_ID} />
        </CrudDialog>
    );
}