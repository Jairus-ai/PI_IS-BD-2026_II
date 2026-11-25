import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockUseDiscounts = jest.fn();
const mockConfirm = jest.fn();
const mockShow = jest.fn();
const mockDeleteDiscount = jest.fn();

const dialogsValue = { confirm: mockConfirm };
const notificationsValue = { show: mockShow };

let actionHandlers;
let crudPageProps;

jest.unstable_mockModule('../hooks/useDiscounts', () => ({
    useDiscounts: mockUseDiscounts,
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

jest.unstable_mockModule('../components/DiscountDetailDialog', () => ({
    default: ({ discountId, open, onClose }) =>
        open ? (
            <div>
                <span>{`Detalle ${discountId}`}</span>
                <button onClick={onClose}>Cerrar detalle</button>
            </div>
        ) : null,
}));

jest.unstable_mockModule('../components/DiscountFormDialog', () => ({
    default: ({ discountId, open, onClose }) =>
        open ? (
            <div>
                <span>{`Formulario ${discountId ?? 'nuevo'}`}</span>
                <button onClick={onClose}>Cerrar formulario</button>
            </div>
        ) : null,
}));

const { default: DiscountList } = await import('../pages/DiscountList');

const DISCOUNTS = [
    { ID_DISCOUNT: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30, DISCOUNT_STATE: 'activo' },
    { ID_DISCOUNT: 7, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50, DISCOUNT_STATE: 'finalizado' },
];

const renderList = () => render(<DiscountList />);
const searchInput = () => screen.getByLabelText('Buscar por nombre');

beforeEach(() => {
    jest.clearAllMocks();
    mockUseDiscounts.mockReturnValue({
        discounts: DISCOUNTS,
        totalDiscounts: 25,
        isLoadingDiscounts: false,
        discountsError: null,
        deleteDiscount: mockDeleteDiscount,
    });
    mockConfirm.mockResolvedValue(true);
    mockDeleteDiscount.mockResolvedValue(undefined);
});

afterEach(cleanup);

describe('DiscountList: render', () => {
    test('muestra el título, el botón de crear y el buscador', () => {
        renderList();

        expect(screen.getByRole('heading', { name: 'Descuentos' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Crear Descuento' })).toBeInTheDocument();
        expect(searchInput()).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
    });

    test('pasa a CrudPage los datos del hook', () => {
        renderList();

        expect(crudPageProps.rows).toEqual(DISCOUNTS);
        expect(crudPageProps.rowCount).toBe(25);
        expect(crudPageProps.loading).toBe(false);
        expect(crudPageProps.error).toBeNull();
        expect(crudPageProps.paginationModel).toEqual({ page: 0, pageSize: 10 });
        expect(crudPageProps.getRowId(DISCOUNTS[1])).toBe(7);
    });

    test('propaga el estado de carga y el error', () => {
        const error = new Error('boom');
        mockUseDiscounts.mockReturnValue({
            discounts: [],
            totalDiscounts: 0,
            isLoadingDiscounts: true,
            discountsError: error,
            deleteDiscount: mockDeleteDiscount,
        });

        renderList();

        expect(crudPageProps.loading).toBe(true);
        expect(crudPageProps.error).toBe(error);
        expect(crudPageProps.rows).toEqual([]);
    });

    test('define las columnas de nombre, porcentaje, estado y acciones', () => {
        renderList();

        expect(crudPageProps.columns.map((column) => column.field)).toEqual([
            'DISCOUNT_NAME',
            'DISCOUNT_PORCENTAGE',
            'DISCOUNT_STATE',
            'actions',
        ]);
        expect(crudPageProps.columns.at(-1).type).toBe('actions');
    });
});

describe('DiscountList: filtros y paginación', () => {
    test('consulta la página 1, sin id ni tipo, y sin filtros al iniciar', () => {
        renderList();

        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null, { name: '' });
    });

    test('escribir en el buscador actualiza el filtro', () => {
        renderList();

        fireEvent.change(searchInput(), { target: { value: 'cumple' } });

        expect(searchInput()).toHaveValue('cumple');
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null, { name: 'cumple' });
    });

    test('cambiar de página consulta la página del servidor (base 1)', () => {
        renderList();

        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        expect(mockUseDiscounts).toHaveBeenLastCalledWith(3, null, null, { name: '' });
    });

    test('cambiar el filtro vuelve a la primera página', () => {
        renderList();
        act(() => crudPageProps.onPaginationModelChange({ page: 2, pageSize: 10 }));

        fireEvent.change(searchInput(), { target: { value: 'cumple' } });

        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null, { name: 'cumple' });
    });

    test('"Limpiar filtros" borra el texto y vuelve a la primera página', () => {
        renderList();
        fireEvent.change(searchInput(), { target: { value: 'cumple' } });
        act(() => crudPageProps.onPaginationModelChange({ page: 4, pageSize: 10 }));

        fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

        expect(searchInput()).toHaveValue('');
        expect(crudPageProps.paginationModel.page).toBe(0);
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null, { name: '' });
    });
});

describe('DiscountList: diálogos', () => {
    test('no hay ningún diálogo abierto al iniciar', () => {
        renderList();

        expect(screen.queryByText(/^Detalle/)).not.toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('"Crear Descuento" abre el formulario sin id', () => {
        renderList();

        fireEvent.click(screen.getByRole('button', { name: 'Crear Descuento' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('cerrar el formulario lo oculta', () => {
        renderList();
        fireEvent.click(screen.getByRole('button', { name: 'Crear Descuento' }));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('editar abre el formulario con el id del descuento', () => {
        renderList();

        act(() => actionHandlers.onEdit(DISCOUNTS[1]));

        expect(screen.getByText('Formulario 7')).toBeInTheDocument();
    });

    test('crear después de editar no arrastra el id anterior', () => {
        renderList();
        act(() => actionHandlers.onEdit(DISCOUNTS[1]));
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar formulario' }));

        fireEvent.click(screen.getByRole('button', { name: 'Crear Descuento' }));

        expect(screen.getByText('Formulario nuevo')).toBeInTheDocument();
    });

    test('mostrar abre el detalle con el id del descuento', () => {
        renderList();

        act(() => actionHandlers.onShow(DISCOUNTS[0]));

        expect(screen.getByText('Detalle 1')).toBeInTheDocument();
        expect(screen.queryByText(/^Formulario/)).not.toBeInTheDocument();
    });

    test('cerrar el detalle lo oculta', () => {
        renderList();
        act(() => actionHandlers.onShow(DISCOUNTS[0]));

        fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));

        expect(screen.queryByText(/^Detalle/)).not.toBeInTheDocument();
    });
});

describe('DiscountList: eliminar', () => {
    test('pide confirmación con el nombre del descuento', async () => {
        renderList();

        act(() => actionHandlers.onDelete(DISCOUNTS[0]));

        await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
        expect(mockConfirm).toHaveBeenCalledWith(
            '¿Desea eliminar el descuento "BIRTHDAY"?',
            expect.objectContaining({
                title: 'Eliminar descuento',
                severity: 'error',
                okText: 'Eliminar',
                cancelText: 'Cancelar',
            }),
        );
    });

    test('si se confirma, elimina con el id suelto y avisa del éxito', async () => {
        renderList();

        act(() => actionHandlers.onDelete(DISCOUNTS[1]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith('Descuento eliminado correctamente.', {
                severity: 'success',
                autoHideDuration: 5000,
            }),
        );
        expect(mockDeleteDiscount).toHaveBeenCalledWith(7);
    });

    test('si se cancela, no elimina ni muestra notificaciones', async () => {
        mockConfirm.mockResolvedValue(false);
        renderList();

        act(() => actionHandlers.onDelete(DISCOUNTS[0]));
        await waitFor(() => expect(mockConfirm).toHaveBeenCalled());
        await act(async () => {});

        expect(mockDeleteDiscount).not.toHaveBeenCalled();
        expect(mockShow).not.toHaveBeenCalled();
    });

    test('si falla el borrado, avisa del error con el motivo', async () => {
        mockDeleteDiscount.mockRejectedValue({
            isAxiosError: true,
            response: {
                data: {
                    message: 'ORA-01031: insufficient privileges',
                },
            },
        });
        renderList();

        act(() => actionHandlers.onDelete(DISCOUNTS[0]));

        await waitFor(() =>
            expect(mockShow).toHaveBeenCalledWith(
                'Error al eliminar el descuento. Motivo: ORA-01031: insufficient privileges',
                {
                    severity: 'error',
                    autoHideDuration: 5000,
                },
            ),
        );
        expect(mockShow).not.toHaveBeenCalledWith(
            'Descuento eliminado correctamente.',
            expect.anything(),
        );
    });
});