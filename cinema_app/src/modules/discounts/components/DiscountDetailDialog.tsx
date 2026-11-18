import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useDiscounts } from '../hooks/useDiscounts';
import type { Discount } from '../types/discounts';
import { DetailField } from '../../../components/crud/DetailField';
import { CrudDialog } from '../../../components/crud/CrudDialog';

interface DiscountDetailDialogProps {
    readonly discountId: number | null;
    readonly open: boolean;
    readonly onClose: () => void;
}

export default function DiscountDetailDialog({
    discountId,
    open,
    onClose,
}: DiscountDetailDialogProps) {
    const { discountDetail, isLoadingDetail } = useDiscounts(1, open ? discountId : null);
    const discount = discountDetail as Discount | null;

    const title = discount?.DISCOUNT_NAME ?? (isLoadingDetail ? 'Cargando…' : 'Descuento');

    console.log(discount);

    return (
        <CrudDialog
            open={open}
            title={title}
            onClose={onClose}
            loading={isLoadingDetail}
            actions={<Button onClick={onClose}>Cerrar</Button>}
        >
            {!discount && discountId != null && !isLoadingDetail && (
                <Alert severity="warning">Sin datos.</Alert>
            )}

            {discount && (
                <Stack spacing={1.5}>
                    <DetailField label="Nombre" value={`${discount.DISCOUNT_NAME}`} />
                    <DetailField
                        label="Porcentaje" 
                        value={`${discount.DISCOUNT_PORCENTAGE}`}
                    />
                    <DetailField
                        label="Fecha de inicio" 
                        value={`${discount.DISCOUNT_START_DATE}`}
                    />
                    <DetailField 
                        label="Fecha de finalización"
                        value={`${discount.DISCOUNT_FINISH_DATE}`} 
                    />
                    <DetailField 
                        label="Tipo" 
                        value={`${discount.TYPE}`}
                    />
                    <DetailField 
                        label="Producto"
                        value={`${discount.NAME_FK_PRODUCT}`} 
                     />
                </Stack>
            )}
        </CrudDialog>
    );
}