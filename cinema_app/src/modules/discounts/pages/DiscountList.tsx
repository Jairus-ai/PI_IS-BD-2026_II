import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useDiscounts } from '../hooks/useDiscounts';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import type { Discount } from '../types/discounts';
import DiscountDetailDialog from '../components/DiscountDetailDialog';
import DiscountFormDialog from '../components/DiscountFormDialog';
import { Actions } from '../../../components/crud/Actions';
import { getErrorMessage } from '../../../services/errorMessage';
import { CrudPage } from '../../../components/crud/CrudPage';

const emptyFilters = {
    name: '',
};

export default function DiscountList() {
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
    const serverPage = paginationModel.page + 1;

    const [filters, setFilters] = React.useState(emptyFilters);
    const [selectedId, setSelectedId] = React.useState<number | null>(null);
    const [formDiscountId, setFormDiscountId] = React.useState<number | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);

    const dialogs = useDialogs();
    const notifications = useNotifications();

    const {
        discounts,
        totalDiscounts,
        isLoadingDiscounts,
        discountsError,
        deleteDiscount,
    } = useDiscounts(serverPage, null, null, filters);

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }

    function clearFilters() {
        setFilters(emptyFilters);
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
    }

    const openCreate = () => {
        setFormDiscountId(null);
        setFormOpen(true);
    };

    const openEdit = (id: number) => {
        setFormDiscountId(id);
        setFormOpen(true);
    };

    const handleRowDelete = React.useCallback(
        async (discount: Discount) => {
            const confirmed = await dialogs.confirm(
                `¿Desea eliminar el descuento "${discount.DISCOUNT_NAME}"?`,
                {
                    title: 'Eliminar descuento',
                    severity: 'error',
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                },
            );

            if (!confirmed) {
                return;
            }

            try {
                await deleteDiscount(discount.ID_DISCOUNT);
                notifications.show('Descuento eliminado correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } catch (error) {
                notifications.show(
                    getErrorMessage(error, 'Error al eliminar el descuento'),
                    {
                        severity: 'error',
                        autoHideDuration: 5000,
                    },
                );
            }
        },
        [dialogs, deleteDiscount, notifications],
    );

    const columns = React.useMemo<GridColDef[]>(
        () => [
            {
                field: 'DISCOUNT_NAME',
                headerName: 'Nombre',
                flex: 1,
                minWidth: 200,
            },
            {
                field: 'DISCOUNT_PORCENTAGE',
                headerName: 'Porcentaje',
                type: 'number',
                width: 120,
                align: 'left',
                headerAlign: 'left',
            },
            {
                field: 'DISCOUNT_STATE',
                headerName: 'Estado',
                width: 120,
            },
            {
                field: 'actions',
                type: 'actions',
                headerName: 'Acciones',
                flex: 1,
                minWidth: 220,
                align: 'right',
                getActions: Actions({
                    onShow: (discount: Discount) => setSelectedId(discount.ID_DISCOUNT),
                    onEdit: (discount: Discount) => openEdit(discount.ID_DISCOUNT),
                    onDelete: (discount: Discount) => {
                        void handleRowDelete(discount);
                    },
                }),
            },
        ],
        [handleRowDelete],
    );

    return (
        <CrudPage
            title="Descuentos"
            createLabel="Crear Descuento"
            onCreate={openCreate}
            error={discountsError}
            rows={discounts}
            rowCount={totalDiscounts}
            getRowId={(row: Discount) => row.ID_DISCOUNT}
            columns={columns}
            loading={isLoadingDiscounts}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            filters={
                <>
                    <TextField
                        label="Buscar por nombre"
                        name="name"
                        value={filters.name}
                        onChange={handleChange}
                        size="small"
                    />
                    <Button
                        variant="outlined"
                        onClick={clearFilters}
                        sx={{ whiteSpace: 'nowrap', minWidth: 'max-content' }}
                    >
                        Limpiar filtros
                    </Button>
                </>
            }
            dialogs={
                <>
                    <DiscountDetailDialog
                        discountId={selectedId}
                        open={selectedId !== null}
                        onClose={() => setSelectedId(null)}
                    />
                    <DiscountFormDialog
                        discountId={formDiscountId}
                        open={formOpen}
                        onClose={() => {
                            setFormOpen(false);
                            setFormDiscountId(null);
                        }}
                    />
                </>
            }
        />
    );
}