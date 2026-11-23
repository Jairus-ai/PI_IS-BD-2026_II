import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useSnacks } from '../hooks/useSnacks';
import type { Snack } from '../types/snacks';
import { DetailField } from '../../../components/crud/DetailField';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface SnackDetailDialogProps {
    readonly SnackId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export default function SnackDetailDialog({
    SnackId,
    open,
    onClose,
}: SnackDetailDialogProps) {
    const { snackDetail, isLoadingDetail } = useSnacks(1, open ? SnackId : null);
    const Snack = snackDetail as Snack | null;

    const title = Snack?.SNACK_NAME ?? (isLoadingDetail ? 'Cargando…' : 'Snack');

    return (
        <CrudDialog
            open={open}
            title={title}
            onClose={onClose}
            loading={isLoadingDetail}
            actions={<Button onClick={onClose}>Cerrar</Button>}
        >
            {!Snack && SnackId != null && !isLoadingDetail && (
                <Alert severity="warning">Sin datos.</Alert>
            )}

            {Snack && (
                <Stack spacing={1.5}>
                    <DetailField label="Nombre" value={Snack.SNACK_NAME} />
                    <DetailField
                        label="Descripción"
                        value={`${Snack.SNACK_DESCRIPTION}`}
                    />
                    <DetailField
                        label="Precio del snack"
                        value={`${Snack.PRICE}`}
                    />
                </Stack>
            )}
        </CrudDialog>
    );
}