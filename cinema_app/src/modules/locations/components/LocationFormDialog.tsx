import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useLocationForm } from '../hooks/useLocationForm';
import LocationFormFields from './LocationFormFields';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface LocationFormDialogProps {
    readonly locationId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSaved?: () => void;
}

const FORM_ID = 'location-form';

export default function LocationFormDialog({
    locationId,
    open,
    onClose,
    onSaved,
}: LocationFormDialogProps) {
    const form = useLocationForm({ locationId, open, onClose, onSaved });

    const title = form.isCreate ? 'Crear sucursal' : 'Editar sucursal';

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
                        {/* El span permite que el Tooltip funcione aunque el botón esté deshabilitado */}
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
            <LocationFormFields form={form} formId={FORM_ID} />
        </CrudDialog>
    );
}