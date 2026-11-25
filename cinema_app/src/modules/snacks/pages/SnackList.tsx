import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useSnacks } from '../hooks/useSnacks';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import type { Snack } from '../types/snacks';
import LocationDetailDialog from '../components/SnackDetailDialog';
import LocationFormDialog from '../components/SnackFormDialog';
import { Actions } from '../../../components/crud/Actions';
import { CrudPage } from '../../../components/crud/CrudPage';
import { getErrorMessage } from '../../../services/errorMessage';


const emptyFilters = {
    name: '',
};

export default function SnackList() {
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
    const serverPage = paginationModel.page + 1;

    const [filters, setFilters] = React.useState(emptyFilters);
    const [selectedId, setSelectedId] = React.useState<number | null>(null);
    const [formSnackId, setFormSnackId] = React.useState<number | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);
    const dialogs = useDialogs();
    const notifications = useNotifications();

    const {
        snacks,
        totalsnacks,
        isLoadingSnacks,
        SnacksError,
        deleteSnack,
    } = useSnacks(serverPage, null ,filters);

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
        setFormSnackId(null);
        setFormOpen(true);
    };

    const openEdit = (id: number) => {
        setFormSnackId(id);
        setFormOpen(true);
    };

    const handleRowDelete = React.useCallback(
        async (snack: Snack) => {
            const confirmed = await dialogs.confirm(
                `¿Desea eliminar el snack "${snack.SNACK_NAME}"?`,
                {
                    title: 'Eliminar snack',
                    severity: 'error',
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                },
            );

            if (!confirmed) {
                return;
            }

            try {
                await deleteSnack({ id: snack.ID_SNACK });
                notifications.show('Snack eliminado correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } catch (error) {
                notifications.show(
                    getErrorMessage(error, 'Error al eliminar el snack'),
                    {
                        severity: 'error',
                        autoHideDuration: 5000,
                    },
                );
            }
        },
        [dialogs, deleteSnack, notifications],
    );

    const columns = React.useMemo<GridColDef[]>(
        () => [
            {
                field: 'SNACK_NAME',
                headerName: 'Nombre',
                flex: 1,
                minWidth: 200,
            },
            {
                field: 'PRICE',
                headerName: 'Precio',
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
                    onShow: (snack: Snack) => setSelectedId(snack.ID_SNACK),
                    onEdit: (snack: Snack) => openEdit(snack.ID_SNACK),
                    onDelete: (snack: Snack) => {
                        void handleRowDelete(snack);
                    },
                }),
            },
        ],
        [handleRowDelete],
    );

    return (
        <CrudPage
            title="Snacks"
            createLabel="Crear Snack"
            onCreate={openCreate}
            error={SnacksError}
            rows={snacks}
            rowCount={totalsnacks}
            getRowId={(row: Snack) => row.ID_SNACK}
            columns={columns}
            loading={isLoadingSnacks}
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
                    <LocationDetailDialog
                        SnackId={selectedId}
                        open={selectedId !== null}
                        onClose={() => setSelectedId(null)}
                    />
                    <LocationFormDialog
                        snackId={formSnackId}
                        open={formOpen}
                        onClose={() => {
                            setFormOpen(false);
                            setFormSnackId(null);
                        }}
                    />
                </>
            }
        />
    );
}