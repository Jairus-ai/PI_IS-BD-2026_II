import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetDiscounts = jest.fn();
const mockGetDiscountsCount = jest.fn();
const mockGetDiscountsByID = jest.fn();
const mockGetDiscountProducts = jest.fn();
const mockAddDiscount = jest.fn();
const mockEditDiscount = jest.fn();
const mockDeleteDiscount = jest.fn();

jest.unstable_mockModule('../services/discountService', () => ({
    getDiscounts: mockGetDiscounts,
    getDiscountsCount: mockGetDiscountsCount,
    getDiscountsByID: mockGetDiscountsByID,
    getDiscountProducts: mockGetDiscountProducts,
    addDiscount: mockAddDiscount,
    editDiscount: mockEditDiscount,
    deleteDiscount: mockDeleteDiscount,
}));

const { useDiscounts } = await import('../hooks/useDiscounts');

const DISCOUNTS = [
    { ID_DISCOUNT: 1, DISCOUNT_NAME: 'BIRTHDAY', DISCOUNT_PORCENTAGE: 30, DISCOUNT_STATE: 'activo' },
    { ID_DISCOUNT: 2, DISCOUNT_NAME: 'D.DAY', DISCOUNT_PORCENTAGE: 50, DISCOUNT_STATE: 'finalizado' },
];
const DETAIL = { ID_DISCOUNT: 4, DISCOUNT_NAME: 'AÑO_APERTURA', DISCOUNT_PORCENTAGE: 25 };
const SNACKS = [{ ID_PRODUCT: 1, PRODUCT_NAME: 'Palomitas' }, { ID_PRODUCT: 2, PRODUCT_NAME: 'Refresco' }];
const MOVIES = [{ ID_PRODUCT: 7, PRODUCT_NAME: 'DUNE from CINEPOLIS' }];
const PAYLOAD = { DISCOUNT_NAME: 'NAVIDAD', DISCOUNT_PORCENTAGE: 15 };

let queryClient;

function wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const setup = (...args) => renderHook(() => useDiscounts(...args), { wrapper });

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity },
            mutations: { retry: false },
        },
    });

    mockGetDiscounts.mockResolvedValue({ data: DISCOUNTS });
    mockGetDiscountsCount.mockResolvedValue({ total: 25 });
    mockGetDiscountsByID.mockResolvedValue({ data: DETAIL });
    mockGetDiscountProducts.mockResolvedValue(SNACKS);
    mockAddDiscount.mockResolvedValue({ message: 'success' });
    mockEditDiscount.mockResolvedValue({ message: 'success' });
    mockDeleteDiscount.mockResolvedValue({ message: 'deleted' });
});

afterEach(() => {
    cleanup();
    queryClient.clear();
});

describe('useDiscounts: lista y conteo', () => {
    test('antes de que lleguen los datos devuelve valores por defecto y está cargando', () => {
        const { result } = setup();

        expect(result.current.discounts).toEqual([]);
        expect(result.current.totalDiscounts).toBe(0);
        expect(result.current.isLoadingDiscounts).toBe(true);
        expect(result.current.discountsError).toBeNull();
    });

    test('desenvuelve la lista (data) y el total (total) de las respuestas', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));
        await waitFor(() => expect(result.current.totalDiscounts).toBe(25));

        expect(result.current.discounts).toEqual(DISCOUNTS);
    });

    test('pide la página 1 y sin filtros por defecto', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        expect(mockGetDiscounts).toHaveBeenCalledWith(1, {});
        expect(mockGetDiscountsCount).toHaveBeenCalledWith({});
    });

    test('pasa la página y los filtros a ambas consultas', async () => {
        const filters = { name: 'cumple' };
        const { result } = setup(3, null, null, filters);

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        expect(mockGetDiscounts).toHaveBeenCalledWith(3, filters);
        expect(mockGetDiscountsCount).toHaveBeenCalledWith(filters);
    });

    test('al cambiar de página vuelve a pedir la lista, pero no el conteo', async () => {
        const { result, rerender } = renderHook(
            ({ page }) => useDiscounts(page, null, null, {}),
            { wrapper, initialProps: { page: 1 } },
        );
        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));
        await waitFor(() => expect(result.current.totalDiscounts).toBe(25));

        rerender({ page: 2 });

        await waitFor(() => expect(mockGetDiscounts).toHaveBeenCalledWith(2, {}));
        expect(mockGetDiscountsCount).toHaveBeenCalledTimes(1);
    });

    test('al cambiar los filtros vuelve a pedir la lista y el conteo', async () => {
        const { result, rerender } = renderHook(
            ({ filters }) => useDiscounts(1, null, null, filters),
            { wrapper, initialProps: { filters: {} } },
        );
        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        rerender({ filters: { name: 'day' } });

        await waitFor(() => expect(mockGetDiscounts).toHaveBeenCalledWith(1, { name: 'day' }));
        await waitFor(() => expect(mockGetDiscountsCount).toHaveBeenCalledWith({ name: 'day' }));
    });

    test('expone el error de la lista', async () => {
        const error = new Error('Network Error');
        mockGetDiscounts.mockRejectedValue(error);
        const { result } = setup();

        await waitFor(() => expect(result.current.discountsError).toBe(error));

        expect(result.current.discounts).toEqual([]);
        expect(result.current.isLoadingDiscounts).toBe(false);
    });

    test('si falta la propiedad data o total, usa los valores por defecto', async () => {
        mockGetDiscounts.mockResolvedValue({});
        mockGetDiscountsCount.mockResolvedValue({});
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        expect(result.current.discounts).toEqual([]);
        expect(result.current.totalDiscounts).toBe(0);
    });
});

describe('useDiscounts: detalle', () => {
    test.each([
        ['null', null],
        ['undefined', undefined],
    ])('no pide el detalle cuando el id es %s', async (_label, id) => {
        const { result } = setup(1, id);

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        expect(mockGetDiscountsByID).not.toHaveBeenCalled();
        expect(result.current.discountDetail).toBeNull();
        expect(result.current.isLoadingDetail).toBe(false);
    });

    test('pide el detalle cuando hay un id y lo desenvuelve', async () => {
        const { result } = setup(1, 4);

        expect(result.current.isLoadingDetail).toBe(true);
        await waitFor(() => expect(result.current.discountDetail).toEqual(DETAIL));

        expect(mockGetDiscountsByID).toHaveBeenCalledWith(4);
        expect(result.current.isLoadingDetail).toBe(false);
    });

    test('al pasar de "sin id" a un id, empieza a pedir el detalle', async () => {
        const { result, rerender } = renderHook(
            ({ id }) => useDiscounts(1, id),
            { wrapper, initialProps: { id: null } },
        );
        expect(mockGetDiscountsByID).not.toHaveBeenCalled();

        rerender({ id: 9 });

        await waitFor(() => expect(result.current.discountDetail).toEqual(DETAIL));
        expect(mockGetDiscountsByID).toHaveBeenCalledWith(9);
    });

    test('devuelve tal cual lo que venga en data (si el backend manda un arreglo, queda un arreglo)', async () => {
        mockGetDiscountsByID.mockResolvedValue({ data: [DETAIL] });
        const { result } = setup(1, 4);

        await waitFor(() => expect(result.current.discountDetail).toEqual([DETAIL]));
    });
});

describe('useDiscounts: productos', () => {
    test.each([
        ['null', null],
        ['undefined', undefined],
    ])('no pide productos cuando el tipo es %s', async (_label, type) => {
        const { result } = setup(1, null, type);

        await waitFor(() => expect(result.current.isLoadingDiscounts).toBe(false));

        expect(mockGetDiscountProducts).not.toHaveBeenCalled();
        expect(result.current.discountProducts).toEqual([]);
        expect(result.current.isLoadingProducts).toBe(false);
    });

    test('con un tipo, pide sus productos y los devuelve sin desenvolver otra vez', async () => {
        const { result } = setup(1, null, 'SNACK');

        await waitFor(() => expect(result.current.discountProducts).toEqual(SNACKS));

        expect(mockGetDiscountProducts).toHaveBeenCalledWith('SNACK');
        expect(result.current.isLoadingProducts).toBe(false);
    });

    test('al cambiar de tipo pide los productos del nuevo tipo y no reutiliza la caché del anterior', async () => {
        mockGetDiscountProducts.mockResolvedValueOnce(SNACKS);
        const { result, rerender } = renderHook(
            ({ type }) => useDiscounts(1, null, type, {}),
            { wrapper, initialProps: { type: 'SNACK' } },
        );
        await waitFor(() => expect(result.current.discountProducts).toEqual(SNACKS));

        mockGetDiscountProducts.mockResolvedValueOnce(MOVIES);
        rerender({ type: 'PELICULA EN CARTELERA' });

        await waitFor(() => expect(mockGetDiscountProducts).toHaveBeenCalledWith('PELICULA EN CARTELERA'));
        await waitFor(() => expect(result.current.discountProducts).toEqual(MOVIES));
    });

    test('al pasar de "sin tipo" a un tipo, empieza a pedir productos', async () => {
        const { result, rerender } = renderHook(
            ({ type }) => useDiscounts(1, null, type, {}),
            { wrapper, initialProps: { type: null } },
        );
        expect(mockGetDiscountProducts).not.toHaveBeenCalled();

        rerender({ type: 'SNACK' });

        await waitFor(() => expect(result.current.discountProducts).toEqual(SNACKS));
    });

    test.each([
        ['un objeto', { data: SNACKS }],
        ['null', null],
        ['texto', 'oops'],
    ])('si el servicio devuelve %s en vez de un arreglo, usa una lista vacía', async (_label, value) => {
        mockGetDiscountProducts.mockResolvedValue(value);
        const { result } = setup(1, null, 'SNACK');

        await waitFor(() => expect(result.current.isLoadingProducts).toBe(false));

        expect(result.current.discountProducts).toEqual([]);
    });

    test('el error de productos no rompe la lista de descuentos', async () => {
        mockGetDiscountProducts.mockRejectedValue(new Error('boom'));
        const { result } = setup(1, null, 'SNACK');

        await waitFor(() => expect(result.current.isLoadingProducts).toBe(false));

        expect(result.current.discountProducts).toEqual([]);
        await waitFor(() => expect(result.current.discounts).toEqual(DISCOUNTS));
    });
});

describe('useDiscounts: crear', () => {
    test('llama al servicio con el payload y el tipo, y devuelve su respuesta', async () => {
        const { result } = setup();
        let response;

        await act(async () => {
            response = await result.current.createDiscount(PAYLOAD, 'SNACK');
        });

        expect(mockAddDiscount).toHaveBeenCalledTimes(1);
        expect(mockAddDiscount.mock.calls[0].slice(0, 2)).toEqual([PAYLOAD, 'SNACK']);
        expect(response).toEqual({ message: 'success' });
    });

    test('al terminar invalida la lista y el conteo', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.createDiscount(PAYLOAD, 'SNACK');
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discounts'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discountsCount'] });
    });


    test('si falla, rechaza la promesa y expone el error, sin invalidar', async () => {
        const error = new Error('Request failed with status code 400');
        mockAddDiscount.mockRejectedValue(error);
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await expect(result.current.createDiscount(PAYLOAD, 'SNACK')).rejects.toThrow('400');
        });

        await waitFor(() => expect(result.current.createDiscountError).toBe(error));
        expect(invalidate).not.toHaveBeenCalled();
    });
});

describe('useDiscounts: actualizar', () => {
    test('llama al servicio con el id, el payload y el tipo por separado', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.updateDiscount(4, PAYLOAD, 'SNACK');
        });

        expect(mockEditDiscount).toHaveBeenCalledTimes(1);
        expect(mockEditDiscount.mock.calls[0].slice(0, 3)).toEqual([4, PAYLOAD, 'SNACK']);
    });

    test('al terminar invalida la lista y el detalle de ese descuento', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.updateDiscount(4, PAYLOAD, 'SNACK');
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discounts'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discount', 4] });
    });

    test('actualizar refresca el detalle abierto con los datos nuevos', async () => {
        const { result } = setup(1, 4);
        await waitFor(() => expect(result.current.discountDetail).toEqual(DETAIL));

        const updated = { ...DETAIL, DISCOUNT_NAME: 'RENOVADO' };
        mockGetDiscountsByID.mockResolvedValue({ data: updated });

        await act(async () => {
            await result.current.updateDiscount(4, PAYLOAD, 'SNACK');
        });

        await waitFor(() => expect(result.current.discountDetail).toEqual(updated));
    });

    test('si falla, rechaza la promesa y no invalida nada', async () => {
        mockEditDiscount.mockRejectedValue(new Error('Request failed with status code 500'));
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await expect(result.current.updateDiscount(4, PAYLOAD, 'SNACK')).rejects.toThrow('500');
        });

        expect(invalidate).not.toHaveBeenCalled();
    });
});

describe('useDiscounts: eliminar', () => {
    test('recibe el id suelto y llama al servicio con él', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.deleteDiscount(4);
        });

        expect(mockDeleteDiscount).toHaveBeenCalledTimes(1);
        expect(mockDeleteDiscount.mock.calls[0][0]).toBe(4);
    });

    test('al terminar invalida la lista y el conteo', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.deleteDiscount(4);
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discounts'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['discountsCount'] });
    });

    test('quita el detalle de la caché en vez de volver a pedirlo', async () => {
        const remove = jest.spyOn(queryClient, 'removeQueries');
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.deleteDiscount(4);
        });

        expect(remove).toHaveBeenCalledWith({ queryKey: ['discount', 4] });
        expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['discount', 4] });
    });

    test('si falla, rechaza la promesa, expone el error y no toca la caché', async () => {
        const error = new Error('Request failed with status code 500');
        mockDeleteDiscount.mockRejectedValue(error);
        const remove = jest.spyOn(queryClient, 'removeQueries');
        const { result } = setup();

        await act(async () => {
            await expect(result.current.deleteDiscount(4)).rejects.toThrow('500');
        });

        await waitFor(() => expect(result.current.deleteDiscountError).toBe(error));
        expect(remove).not.toHaveBeenCalled();
    });
});