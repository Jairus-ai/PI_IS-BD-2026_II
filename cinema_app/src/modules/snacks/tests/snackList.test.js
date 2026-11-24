import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseSnacks = jest.fn();
const mockConfirm = jest.fn();
const mockShow = jest.fn();
const mockDeleteSnack = jest.fn();
const mockGetErrorMessage = jest.fn();

const dialogsValue = { confirm: mockConfirm };
const notificationsValue = { show: mockShow };

let actionHandlers;
let crudPageProps;
let detailDialogProps;
let formDialogProps;

jest.unstable_mockModule('../hooks/useSnacks', () => ({
    useSnacks: mockUseSnacks,
}));
jest.unstable_mockModule('../../../hooks/useDialogs', () => ({
    useDialogs: () => dialogsValue,
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
    default: () => notificationsValue,
}));
jest.unstable_mockModule('../../../services/errorMessage', () => ({
    getErrorMessage: mockGetErrorMessage,
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

jest.unstable_mockModule('../components/SnackDetailDialog', () => ({
    default: (props) => {
        detailDialogProps = props;
        return props.open ? (
            <div>
                <span>Detalle</span>
                <button onClick={props.onClose}>Cerrar detalle</button>
            </div>
        ) : null;
    },
}));

jest.unstable_mockModule('../components/SnackFormDialog', () => ({
    default: (props) => {
        formDialogProps = props;
        return props.open ? (
            <div>
                <span>{`Formulario ${props.snackId ?? 'nuevo'}`}</span>
                <button onClick={props.onClose}>Cerrar formulario</button>
            </div>
        ) : null;
    },
}));

const { default: SnackList } = await import('../pages/SnackList');

const SNACKS = [
    { ID_SNACK: 1, SNACK_NAME: 'PALOMITAS', PRICE: 2500 },
    { ID_SNACK: 7, SNACK_NAME: 'REFRESCO', PRICE: 1500 },
];

const renderList = () => render(<SnackList />);
const searchInput = () => screen.getByLabelText('Buscar por nombre');

beforeEach(() => {
    jest.clearAllMocks();
    mockUseSnacks.mockReturnValue({
        snacks: SNACKS,
        totalsnacks: 25,
        isLoadingSnacks: false,
        SnacksError: null,
        deleteSnack: mockDeleteSnack,
    });
    mockConfirm.mockResolvedValue(true);
    mockDeleteSnack.mockResolvedValue(undefined);
    mockGetErrorMessage.mockImplementation((error, prefix) => `${prefix}: ${error.message}`);
});

afterEach(cleanup);

describe('SnackList: render', () => {
    test('muestra el título, el botón de crear y el buscador', () => {
        renderList();

        expect(screen.getByRole('heading', { name: 'Snacks' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Snack' })).toBeInTheDocument();
        expect(searchInput()).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
    });

    test('pasa a CrudPage los datos del hook', () => {
        renderList();

        expect(crudPageProps.rows).toEqual(SNACKS);
        expect(crudPageProps.rowCount).toBe(25);
        expect(crudPageProps.loading).toBe(false);
        expect(crudPageProps.error).toBeNull();
        expect(crudPageProps.paginationModel).toEqual({ page: 0, pageSize: 10 });
        expect(crudPageProps.getRowId(SNACKS[1])).toBe(7);
    });

    test('propaga el estado de carga y el error', () => {
        const error = new Error('boom');
        mockUseSnacks.mockReturnValue({
            snacks: [],
            totalsnacks: 0,
            isLoadingSnacks: true,
            SnacksError: error,
            deleteSnack: mockDeleteSnack,
        });

        renderList();

        expect(crudPageProps.loading).toBe(true);
        expect(crudPageProps.error).toBe(error);
        expect(crudPageProps.rows).toEqual([]);
    });

    test('define las columnas de nombre, precio y acciones', () => {
        renderList();

        expect(crudPageProps.columns.map((column) => column.field)).toEqual([
            'SNACK_NAME',
            'PRICE',
            'actions',
        ]);
        expect(crudPageProps.columns.at(-1).type).toBe('actions');
    });
});


describe('SnackList: filtros y paginación', () => {
    test('consulta la página 1, sin id, y sin filtros al iniciar', () => {
        renderList();

        expect(mockUseSnacks).toHaveBeenLastCalledWith(1, null, { name: '' });
    });

    test('escribir en el buscador actualiza el filtro', () => {
        renderList();

        fireEvent.change(searchInput(), { target: { value: 'palo' } });

        expect(searchInput()).toHaveValue('palo');
        expect(mockUseSnacks).toHaveBeenLastCalledWith(1, null, { name: 'palo' });
    });

    test('cambiar de página consulta la página del servidor (base 1)', () => {
        renderList();

        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        expect(mockUseSnacks).toHaveBeenLastCalledWith(3, null, { name: '' });
    });

    test('cambiar el filtro vuelve a la primera página', () => {
        renderList();
        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        fireEvent.change(searchInput(), { target: { value: 'palo' } });

        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseSnacks).toHaveBeenLastCalledWith(1, null, { name: 'palo' });
    });

    test('"Limpiar filtros" borra el texto y vuelve a la primera página', () => {
        renderList();
        fireEvent.change(searchInput(), { target: { value: 'palo' } });
        act(() => crudPageProps.onPaginationModelChange({ page: 4, pageSize: 10 }));

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

        expect(searchInput()).toHaveValue('');
        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseSnacks).toHaveBeenLastCalledWith(1, null, { name: '' });
    });
});


describe('SnackList: diálogos', () => {
    test('no hay ningún diálogo abierto al iniciar', () => {
        renderList();

        expect(screen.queryByText('Detalle')).not.toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('"Crear Snack" abre el formulario sin id', () => {
        renderList();

        fireEvent.click(screen.getByRole('button', { name: 'Crear Snack' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('cerrar el formulario lo oculta', () => {
        renderList();
        fireEvent.click(screen.getByRole('button', { name: 'Crear Snack' }));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('editar abre el formulario con el id del snack', () => {
        renderList();

        act(() => actionHandlers.onEdit(SNACKS[1]));

        expect(screen.getByText('Formulario 7')).toBeInTheDocument();
        expect(formDialogProps.snackId).toBe(7);
    });

    test('crear después de editar no arrastra el id anterior', () => {
        renderList();
        act(() => actionHandlers.onEdit(SNACKS[1]));
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        fireEvent.click(screen.getByRole('button', { name: 'Crear Snack' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('mostrar abre el detalle y no el formulario', () => {
        renderList();

        act(() => actionHandlers.onShow(SNACKS[0]));

        expect(screen.getByText('Detalle')).toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('cerrar el detalle lo oculta', () => {
        renderList();
        act(() => actionHandlers.onShow(SNACKS[0]));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

        expect(screen.queryByText('Detalle')).not.toBeInTheDocument();
    });
});


describe('SnackList: eliminar', () => {
    test('pide confirmación con el nombre del snack', async () => {
        renderList();

        act(() => actionHandlers.onDelete(SNACKS[0]));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
        expect(mockConfirm).toHaveBeenCalledWith(
            '¿Desea eliminar el snack "PALOMITAS"?',
            expect.objectContaining({
                title: 'Eliminar snack',
                severity: 'error',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
            }),
        );
    });

    test('si se confirma, elimina por id y avisa del éxito', async () => {
        renderList();

        act(() => actionHandlers.onDelete(SNACKS[1]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith('Snack eliminado correctamente.', {
                severity: 'success',
                autoHideDuration: 5000,
            }),
        );
        expect(mockDeleteSnack).toHaveBeenCalledWith({ id: 7 });
    });

    test('si se cancela, no elimina ni muestra notificaciones', async () => {
        mockConfirm.mockResolvedValue(false);
        renderList();

        act(() => actionHandlers.onDelete(SNACKS[0]));
        await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
        await act(async () => {});

        expect(mockDeleteSnack).not.toHaveBeenCalled();
        expect(mockShow).not.toHaveBeenCalled();
    });

    test('si falla el borrado, avisa del error con el mensaje que arma getErrorMessage', async () => {
        const error = new Error('ORA-02292: child record found');
        mockDeleteSnack.mockRejectedValue(error);
        renderList();

        act(() => actionHandlers.onDelete(SNACKS[0]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith(
                expect.stringContaining('ORA-02292'),
                { severity: 'error', autoHideDuration: 5000 },
            ),
        );
        expect(mockShow).not.toHaveBeenCalledWith(
            'Snack eliminado correctamente.',
            expect.anything(),
        );
    });
});