import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useDiscountForm } from '../hooks/useDiscountForm';
import DiscountFormFields from './DiscountFormFields';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface DiscountFormDialogProps {
    readonly discountId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
    readonly onSaved?: () => void;
}

const FORM_ID = 'discount-form';

export default function DiscountFormDialog({
    discountId,
    open,
    onClose,
    onSaved,
}: DiscountFormDialogProps) {
    const form = useDiscountForm({ discountId, open, onClose, onSaved });

    const title = form.isCreate ? 'Crear descuento' : 'Editar descuento';

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
            <DiscountFormFields form={form} formId={FORM_ID} />
        </CrudDialog>
    );
}