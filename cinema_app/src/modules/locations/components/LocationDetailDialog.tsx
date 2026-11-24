import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useLocations } from '../hooks/useLocations';
import type { Location } from '../types/locations';
import { DetailField } from '../../../components/crud/DetailField';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface LocationDetailDialogProps {
    readonly locationId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export default function LocationDetailDialog({
    locationId,
    open,
    onClose,
}: LocationDetailDialogProps) {
    const { locationDetail, isLoadingDetail } = useLocations(1, open ? locationId : null);
    const location = locationDetail as Location | null;

    const title = location?.LOCATION_NAME ?? (isLoadingDetail ? 'Cargando…' : 'Sucursal');

    return (
        <CrudDialog
            open={open}
            title={title}
            onClose={onClose}
            loading={isLoadingDetail}
            actions={<Button onClick={onClose}>Cerrar</Button>}
        >
            {!location && locationId != null && !isLoadingDetail && (
                <Alert severity="warning">Sin datos.</Alert>
            )}

            {location && (
                <Stack spacing={1.5}>
                    <DetailField label="Nombre" value={location.LOCATION_NAME} />
                    <DetailField
                        label="Hora de apertura"
                        value={`${location.OPENING_HOUR}`}
                    />
                    <DetailField
                        label="Hora de cierre"
                        value={`${location.CLOSING_HOUR}`}
                    />
                    <DetailField label="Provincia" value={location.PROVINCE_NAME} />
                    <DetailField label="Cantón" value={location.CANTON_NAME} />
                </Stack>
            )}
        </CrudDialog>
    );
}