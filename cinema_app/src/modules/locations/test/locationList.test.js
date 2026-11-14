import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseLocations = jest.fn();

const mockConfirm = jest.fn();
const mockShow = jest.fn();
const mockDeleteLocation = jest.fn();

const dialogsValue = { confirm: mockConfirm };
const notificationsValue = { show: mockShow };

let actionHandlers; 
let crudPageProps; 

jest.unstable_mockModule('../hooks/useLocations', () => ({
    useLocations: mockUseLocations,
}));
jest.unstable_mockModule('../../../hooks/useDialogs', () => ({
    useDialogs: () => dialogsValue,
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
    default: () => notificationsValue,
}));

jest.unstable_mockModule('../../../components/crud/Actions', () => ({
    Actions: (handlers) => {
        actionHandlers = handlers;
        return () => [];
    },
}));

jest.unstable_mockModule('../../../components/crud/CrudPage', () => ({
    CrudPage: (props) => {
        crudPageProps = props;
        return (
            <section>
                <h1>{props.title}</h1>
                <button onClick={props.onCreate}>{props.createLabel}</button>
                {props.filters}
                {props.dialogs}
            </section>
        );
    },
}));

jest.unstable_mockModule('../components/LocationDetailDialog', () => ({
    default: ({ locationId, open, onClose }) =>
        open ? (
            <div>
                <span>{`Detalle ${locationId}`}</span>
                <button onClick={onClose}>Cerrar detalle</button>
            </div>
        ) : null,
}));

jest.unstable_mockModule('../components/LocationFormDialog', () => ({
    default: ({ locationId, open, onClose }) =>
        open ? (
            <div>
                <span>{`Formulario ${locationId ?? 'nuevo'}`}</span>
                <button onClick={onClose}>Cerrar formulario</button>
            </div>
        ) : null,
}));

const { default: LocationList } = await import('../pages/LocationList');


const LOCATIONS = [
    { ID_LOCATION: 1, LOCATION_NAME: 'CINE CENTRO', OPENING_HOUR: '07:00', CLOSING_HOUR: '21:00', CANTON_NAME: 'San José' },
    { ID_LOCATION: 7, LOCATION_NAME: 'CINE NORTE', OPENING_HOUR: '08:30', CLOSING_HOUR: '22:00', CANTON_NAME: 'Heredia' },
];

const renderList = () => render(<LocationList />);
const searchInput = () => screen.getByLabelText('Buscar por nombre');

beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocations.mockReturnValue({
        locations: LOCATIONS,
        totalLocations: 25,
        isLoadingLocations: false,
        LocationsError: null,
        deleteLocation: mockDeleteLocation,
    });
    mockConfirm.mockResolvedValue(true);
    mockDeleteLocation.mockResolvedValue(undefined);
});

afterEach(cleanup);


describe('LocationList: render', () => {
    test('muestra el título, el botón de crear y el buscador', () => {
        renderList();

        expect(screen.getByRole('heading', { name: 'Sucursales' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Sucursal' })).toBeInTheDocument();
        expect(searchInput()).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
    });

    test('pasa a CrudPage los datos del hook', () => {
        renderList();

        expect(crudPageProps.rows).toEqual(LOCATIONS);
        expect(crudPageProps.rowCount).toBe(25);
        expect(crudPageProps.loading).toBe(false);
        expect(crudPageProps.error).toBeNull();
        expect(crudPageProps.paginationModel).toEqual({ page: 0, pageSize: 10 });
        expect(crudPageProps.getRowId(LOCATIONS[1])).toBe(7);
    });

    test('propaga el estado de carga y el error', () => {
        const error = new Error('boom');
        mockUseLocations.mockReturnValue({
            locations: [],
            totalLocations: 0,
            isLoadingLocations: true,
            LocationsError: error,
            deleteLocation: mockDeleteLocation,
        });

        renderList();

        expect(crudPageProps.loading).toBe(true);
        expect(crudPageProps.error).toBe(error);
        expect(crudPageProps.rows).toEqual([]);
    });

    test('define las columnas de nombre, apertura, cierre y acciones', () => {
        renderList();

        expect(crudPageProps.columns.map((column) => column.field)).toEqual([
            'LOCATION_NAME',
            'OPENING_HOUR',
            'CLOSING_HOUR',
            'actions',
        ]);
        expect(crudPageProps.columns.at(-1).type).toBe('actions');
    });
});


describe('LocationList: filtros y paginación', () => {
    test('consulta la página 1 y sin filtros al iniciar', () => {
        renderList();

        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null, { name: '' });
    });

    test('escribir en el buscador actualiza el filtro', () => {
        renderList();

        fireEvent.change(searchInput(), { target: { value: 'cine' } });

        expect(searchInput()).toHaveValue('cine');
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null, { name: 'cine' });
    });

    test('cambiar de página consulta la página del servidor (base 1)', () => {
        renderList();

        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        expect(mockUseLocations).toHaveBeenLastCalledWith(3, null, null, { name: '' });
    });

    test('cambiar el filtro vuelve a la primera página', () => {
        renderList();
        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        fireEvent.change(searchInput(), { target: { value: 'cine' } });

        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null, { name: 'cine' });
    });

    test('"Limpiar filtros" borra el texto y vuelve a la primera página', () => {
        renderList();
        act(() => crudPageProps.onPaginationModelChange({ page: 4, pageSize: 10 }));
        fireEvent.change(searchInput(), { target: { value: 'cine' } });
        act(() => crudPageProps.onPaginationModelChange({ page: 4, pageSize: 10 }));

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

        expect(searchInput()).toHaveValue('');
        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null, { name: '' });
    });
});


describe('LocationList: diálogos', () => {
    test('no hay ningún diálogo abierto al iniciar', () => {
        renderList();

        expect(screen.queryByText(/^Detalle/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('"Crear Sucursal" abre el formulario sin id', () => {
        renderList();

        fireEvent.click(screen.getByRole('button', { name: 'Crear Sucursal' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('cerrar el formulario lo oculta', () => {
        renderList();
        fireEvent.click(screen.getByRole('button', { name: 'Crear Sucursal' }));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('editar abre el formulario con el id de la sucursal', () => {
        renderList();

        act(() => actionHandlers.onEdit(LOCATIONS[1]));

        expect(screen.getByText('Formulario 7')).toBeInTheDocument();
    });

    test('crear después de editar no arrastra el id anterior', () => {
        renderList();
        act(() => actionHandlers.onEdit(LOCATIONS[1]));
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        fireEvent.click(screen.getByRole('button', { name: 'Crear Sucursal' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('mostrar abre el detalle con el id de la sucursal', () => {
        renderList();

        act(() => actionHandlers.onShow(LOCATIONS[0]));

        expect(screen.getByText('Detalle 1')).toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('cerrar el detalle lo oculta', () => {
        renderList();
        act(() => actionHandlers.onShow(LOCATIONS[0]));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

        expect(screen.queryByText(/^Detalle/)).not.toBeInTheDocument();
    });
});


describe('LocationList: eliminar', () => {
    test('pide confirmación con el nombre de la sucursal', async () => {
        renderList();

        act(() => actionHandlers.onDelete(LOCATIONS[0]));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
        expect(mockConfirm).toHaveBeenCalledWith(
            '¿Desea eliminar la sucursal "CINE CENTRO"?',
            expect.objectContaining({
                title: 'Eliminar sucursal',
                severity: 'error',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
            }),
        );
    });

    test('si se confirma, elimina por id y avisa del éxito', async () => {
        renderList();

        act(() => actionHandlers.onDelete(LOCATIONS[1]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith('Sucursal eliminada correctamente.', {
                severity: 'success',
                autoHideDuration: 5000,
            }),
        );
        expect(mockDeleteLocation).toHaveBeenCalledWith({ id: 7 });
    });

    test('si se cancela, no elimina ni muestra notificaciones', async () => {
        mockConfirm.mockResolvedValue(false);
        renderList();

        act(() => actionHandlers.onDelete(LOCATIONS[0]));
        await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
        await act(async () => {});

        expect(mockDeleteLocation).not.toHaveBeenCalled();
        expect(mockShow).not.toHaveBeenCalled();
    });

    test('si falla el borrado, avisa del error con el motivo', async () => {
        mockDeleteLocation.mockRejectedValue(new Error('ORA-02292: child record found'));
        renderList();

        act(() => actionHandlers.onDelete(LOCATIONS[0]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith(
                'Error al eliminar la sucursal: ORA-02292: child record found',
                { severity: 'error', autoHideDuration: 5000 },
            ),
        );
        expect(mockShow).not.toHaveBeenCalledWith(
            'Sucursal eliminada correctamente.',
            expect.anything(),
        );
    });
});
