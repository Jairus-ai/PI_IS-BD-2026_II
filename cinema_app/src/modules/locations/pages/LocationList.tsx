import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import type { GridColDef } from '@mui/x-data-grid';
import { useLocations } from '../hooks/useLocations';
import { useDialogs } from '../../../hooks/useDialogs';
import useNotifications from '../../../hooks/useNotifications';
import type { Location } from '../types/locations';
import LocationDetailDialog from '../components/LocationDetailDialog';
import LocationFormDialog from '../components/LocationFormDialog';
import { Actions } from '../../../components/crud/Actions';
import { CrudPage } from '../../../components/crud/CrudPage';

const emptyFilters = {
    name: '',
};

export default function LocationList() {
    const [paginationModel, setPaginationModel] = React.useState({ page: 0, pageSize: 10 });
    const serverPage = paginationModel.page + 1;

    const [filters, setFilters] = React.useState(emptyFilters);
    const [selectedId, setSelectedId] = React.useState<number | null>(null);
    const [formLocationId, setFormLocationId] = React.useState<number | null>(null);
    const [formOpen, setFormOpen] = React.useState(false);
    const dialogs = useDialogs();
    const notifications = useNotifications();

    const {
        locations,
        totalLocations,
        isLoadingLocations,
        LocationsError,
        deleteLocation,
    } = useLocations(serverPage, null,null ,filters);

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
        setFormLocationId(null);
        setFormOpen(true);
    };

    const openEdit = (id: number) => {
        setFormLocationId(id);
        setFormOpen(true);
    };

    const handleRowDelete = React.useCallback(
        async (location: Location) => {
            const confirmed = await dialogs.confirm(
                `¿Desea eliminar la sucursal "${location.LOCATION_NAME}"?`,
                {
                    title: 'Eliminar sucursal',
                    severity: 'error',
                    okText: 'Eliminar',
                    cancelText: 'Cancelar',
                },
            );

            if (!confirmed) {
                return;
            }

            try {
                await deleteLocation({ id: location.ID_LOCATION });
                notifications.show('Sucursal eliminada correctamente.', {
                    severity: 'success',
                    autoHideDuration: 5000,
                });
            } catch (error) {
                notifications.show(
                    `Error al eliminar la sucursal: ${(error as Error).message}`,
                    {
                        severity: 'error',
                        autoHideDuration: 5000,
                    },
                );
            }
        },
        [dialogs, deleteLocation, notifications],
    );

    const columns = React.useMemo<GridColDef[]>(
        () => [
            {
                field: 'LOCATION_NAME',
                headerName: 'Nombre',
                flex: 1,
                minWidth: 200,
            },
            {
                field: 'OPENING_HOUR',
                headerName: 'Apertura',
                width: 120,
            },
            {
                field: 'CLOSING_HOUR',
                headerName: 'Cierre',
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
                    onShow: (location: Location) => setSelectedId(location.ID_LOCATION),
                    onEdit: (location: Location) => openEdit(location.ID_LOCATION),
                    onDelete: (location: Location) => {
                        void handleRowDelete(location);
                    },
                }),
            },
        ],
        [handleRowDelete],
    );

    return (
        <CrudPage
            title="Sucursales"
            createLabel="Crear Sucursal"
            onCreate={openCreate}
            error={LocationsError}
            rows={locations}
            rowCount={totalLocations}
            getRowId={(row: Location) => row.ID_LOCATION}
            columns={columns}
            loading={isLoadingLocations}
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
                        locationId={selectedId}
                        open={selectedId !== null}
                        onClose={() => setSelectedId(null)}
                    />
                    <LocationFormDialog
                        locationId={formLocationId}
                        open={formOpen}
                        onClose={() => {
                            setFormOpen(false);
                            setFormLocationId(null);
                        }}
                    />
                </>
            }
        />
    );
}