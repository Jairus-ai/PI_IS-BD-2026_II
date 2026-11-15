import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetLocations = jest.fn();
const mockGetLocationsCount = jest.fn();
const mockGetLocationById = jest.fn();
const mockCreateLocation = jest.fn();
const mockUpdateLocation = jest.fn();
const mockDeleteLocation = jest.fn();
const mockGetCantons = jest.fn();
const mockGetProvinces = jest.fn();

jest.unstable_mockModule('../services/locationService', () => ({
    getLocations: mockGetLocations,
    getLocationsCount: mockGetLocationsCount,
    getLocationById: mockGetLocationById,
    getCantons: mockGetCantons,
    getProvinces: mockGetProvinces,
    createLocation: mockCreateLocation,
    updateLocation: mockUpdateLocation,
    deleteLocation: mockDeleteLocation,
}));

const { useLocations } = await import('../hooks/useLocations');

const PROVINCES = [
    { ID_PROVINCE: 1, PROVINCE_NAME: 'San José' },
    { ID_PROVINCE: 3, PROVINCE_NAME: 'Cartago' },
];
const CANTONS = [
    { ID_CANTON: 9, CANTON_NAME: 'Paraíso' },
    { ID_CANTON: 10, CANTON_NAME: 'Turrialba' },
];

const LOCATIONS = [
    { ID_LOCATION: 1, LOCATION_NAME: 'CINE CENTRO' },
    { ID_LOCATION: 7, LOCATION_NAME: 'CINE NORTE' },
];
const DETAIL = { LOCATION_NAME: 'CINE CENTRO', OPENING_HOUR: '07:00', CLOSING_HOUR: '21:00', CANTON_NAME: 'San José' };
const PAYLOAD = { LOCATION_NAME: 'CINE SUR', OPENING_HOUR: '08:30', CLOSING_HOUR: '22:00', CANTON_NAME: 'Cartago' };

let queryClient;

function wrapper({ children }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const setup = (...args) => renderHook(() => useLocations(...args), { wrapper });

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

    mockGetLocations.mockResolvedValue({ data: LOCATIONS });
    mockGetLocationsCount.mockResolvedValue({ total: 25 });
    mockGetLocationById.mockResolvedValue({ data: DETAIL });
    mockCreateLocation.mockResolvedValue({ message: 'success' });
    mockUpdateLocation.mockResolvedValue({ message: 'success' });
    mockDeleteLocation.mockResolvedValue(undefined);
    mockGetProvinces.mockResolvedValue({ data: [] });
    mockGetCantons.mockResolvedValue({ data: [] });
});

afterEach(() => {
    cleanup();
    queryClient.clear();
});

describe('useLocations: lista y conteo', () => {
    test('antes de que lleguen los datos devuelve valores por defecto y está cargando', () => {
        const { result } = setup();

        expect(result.current.locations).toEqual([]);
        expect(result.current.totalLocations).toBe(0);
        expect(result.current.isLoadingLocations).toBe(true);
        expect(result.current.LocationsError).toBeNull();
    });

    test('desenvuelve la lista (data) y el total (total) de las respuestas', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));
        await waitFor(() => expect(result.current.totalLocations).toBe(25));

        expect(result.current.locations).toEqual(LOCATIONS);
    });

    test('pide la página 1 y sin filtros por defecto', async () => {
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));

        expect(mockGetLocations).toHaveBeenCalledWith(1, {});
        expect(mockGetLocationsCount).toHaveBeenCalledWith({});
    });

    test('pasa la página y los filtros a ambas consultas', async () => {
        const filters = { name: 'cine' };
        const { result } = setup(3, null, null, filters);

        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));

        expect(mockGetLocations).toHaveBeenCalledWith(3, filters);
        expect(mockGetLocationsCount).toHaveBeenCalledWith(filters);
    });

    test('al cambiar de página vuelve a pedir la lista, pero no el conteo', async () => {
        const { result, rerender } = renderHook(
            ({ page }) => useLocations(page, null, null, {}),
            { wrapper, initialProps: { page: 1 } },
        );
        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));
        await waitFor(() => expect(result.current.totalLocations).toBe(25));

        rerender({ page: 2 });

        await waitFor(() => expect(mockGetLocations).toHaveBeenCalledWith(2, {}));
        expect(mockGetLocationsCount).toHaveBeenCalledTimes(1); 
    });

    test('al cambiar los filtros vuelve a pedir la lista y el conteo', async () => {
        const { result, rerender } = renderHook(
            ({ filters }) => useLocations(1, null, null, filters),
            { wrapper, initialProps: { filters: {} } },
        );
        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));

        rerender({ filters: { name: 'norte' } });

        await waitFor(() => expect(mockGetLocations).toHaveBeenCalledWith(1, { name: 'norte' }));
        await waitFor(() => expect(mockGetLocationsCount).toHaveBeenCalledWith({ name: 'norte' }));
    });

    test('expone el error de la lista', async () => {
        const error = new Error('Network Error');
        mockGetLocations.mockRejectedValue(error);
        const { result } = setup();

        await waitFor(() => expect(result.current.LocationsError).toBe(error));

        expect(result.current.locations).toEqual([]);
        expect(result.current.isLoadingLocations).toBe(false);
    });

    test('si falta la propiedad data o total, usa los valores por defecto', async () => {
        mockGetLocations.mockResolvedValue({});
        mockGetLocationsCount.mockResolvedValue({});
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));

        expect(result.current.locations).toEqual([]);
        expect(result.current.totalLocations).toBe(0);
    });
});

describe('useLocations: detalle', () => {
    test.each([
        ['null', null],
        ['undefined', undefined],
    ])('no pide el detalle cuando el id es %s', async (_label, id) => {
        const { result } = setup(1, id);

        await waitFor(() => expect(result.current.isLoadingLocations).toBe(false));

        expect(mockGetLocationById).not.toHaveBeenCalled();
        expect(result.current.locationDetail).toBeNull();
        expect(result.current.isLoadingDetail).toBe(false);
    });

    test('pide el detalle cuando hay un id y lo desenvuelve', async () => {
        const { result } = setup(1, 5);

        expect(result.current.isLoadingDetail).toBe(true);
        await waitFor(() => expect(result.current.locationDetail).toEqual(DETAIL));

        expect(mockGetLocationById).toHaveBeenCalledWith(5);
        expect(result.current.isLoadingDetail).toBe(false);
    });

    test('un id igual a 0 también cuenta como id (no se confunde con "sin id")', async () => {
        const { result } = setup(1, 0);

        await waitFor(() => expect(result.current.locationDetail).toEqual(DETAIL));

        expect(mockGetLocationById).toHaveBeenCalledWith(0);
    });

    test('al pasar de "sin id" a un id, empieza a pedir el detalle', async () => {
        const { result, rerender } = renderHook(
            ({ id }) => useLocations(1, id),
            { wrapper, initialProps: { id: null } },
        );
        expect(mockGetLocationById).not.toHaveBeenCalled();

        rerender({ id: 9 });

        await waitFor(() => expect(result.current.locationDetail).toEqual(DETAIL));
        expect(mockGetLocationById).toHaveBeenCalledWith(9);
    });

    test('devuelve tal cual lo que venga en data (si el backend manda un arreglo, queda un arreglo)', async () => {
        mockGetLocationById.mockResolvedValue({ data: [DETAIL] });
        const { result } = setup(1, 5);

        await waitFor(() => expect(result.current.locationDetail).toEqual([DETAIL]));
    });
});

describe('useLocations: crear', () => {
    test('llama al servicio con el payload y devuelve su respuesta', async () => {
        const { result } = setup();
        let response;

        await act(async () => {
            response = await result.current.createLocation(PAYLOAD);
        });

        expect(mockCreateLocation).toHaveBeenCalledTimes(1);
        expect(mockCreateLocation.mock.calls[0][0]).toEqual(PAYLOAD);
        expect(response).toEqual({ message: 'success' });
    });

    test('al terminar invalida la lista y el conteo', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.createLocation(PAYLOAD);
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['locations'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['locationsCount'] });
    });

    test('si falla, rechaza la promesa y expone el error, sin invalidar', async () => {
        const error = new Error('Request failed with status code 400');
        mockCreateLocation.mockRejectedValue(error);
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await expect(result.current.createLocation(PAYLOAD)).rejects.toThrow('400');
        });

        await waitFor(() => expect(result.current.createLocationError).toBe(error));
        expect(invalidate).not.toHaveBeenCalled();
    });
});

describe('useLocations: actualizar', () => {
    test('llama al servicio con el id y el payload por separado', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.updateLocation(7, PAYLOAD);
        });

        expect(mockUpdateLocation).toHaveBeenCalledTimes(1);
        expect(mockUpdateLocation.mock.calls[0].slice(0, 2)).toEqual([7, PAYLOAD]);
    });

    test('al terminar invalida la lista y el detalle de esa sucursal', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.updateLocation(7, PAYLOAD);
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['locations'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['location', 7] });
    });

    test('actualizar refresca el detalle abierto con los datos nuevos', async () => {
        const { result } = setup(1, 7);
        await waitFor(() => expect(result.current.locationDetail).toEqual(DETAIL));

        const updated = { ...DETAIL, LOCATION_NAME: 'CINE RENOVADO' };
        mockGetLocationById.mockResolvedValue({ data: updated });

        await act(async () => {
            await result.current.updateLocation(7, PAYLOAD);
        });

        await waitFor(() => expect(result.current.locationDetail).toEqual(updated));
    });

    test('si falla, rechaza la promesa y no invalida nada', async () => {
        mockUpdateLocation.mockRejectedValue(new Error('Request failed with status code 500'));
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await expect(result.current.updateLocation(7, PAYLOAD)).rejects.toThrow('500');
        });

        expect(invalidate).not.toHaveBeenCalled();
    });
});

describe('useLocations: eliminar', () => {
    test('llama al servicio con el id que recibe en { id }', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.deleteLocation({ id: 4 });
        });

        expect(mockDeleteLocation).toHaveBeenCalledTimes(1);
        expect(mockDeleteLocation.mock.calls[0][0]).toBe(4);
    });

    test('al terminar invalida la lista y el detalle de esa sucursal', async () => {
        const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
        const { result } = setup();

        await act(async () => {
            await result.current.deleteLocation({ id: 4 });
        });

        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['locations'] });
        expect(invalidate).toHaveBeenCalledWith({ queryKey: ['location', 4] });
    });

    test('la firma exige un objeto: pasar el id suelto no llega como id', async () => {
        const { result } = setup();

        await act(async () => {
            await result.current.deleteLocation(4);
        });

        expect(mockDeleteLocation.mock.calls[0][0]).toBeUndefined();
    });

    test('si falla, rechaza la promesa y expone el error', async () => {
        const error = new Error('Request failed with status code 409');
        mockDeleteLocation.mockRejectedValue(error);
        const { result } = setup();

        await act(async () => {
            await expect(result.current.deleteLocation({ id: 4 })).rejects.toThrow('409');
        });

        await waitFor(() => expect(result.current.deleteLocationError).toBe(error));
    });
});

describe('useLocations: provincias', () => {
    test('antes de que lleguen devuelve una lista vacía y está cargando', () => {
        const { result } = setup();

        expect(result.current.locationProvinces).toEqual([]);
        expect(result.current.isLoadingProvinces).toBe(true);
    });

    test('pide las provincias una vez y las desenvuelve', async () => {
        mockGetProvinces.mockResolvedValue({ data: PROVINCES });
        const { result } = setup();

        await waitFor(() => expect(result.current.locationProvinces).toEqual(PROVINCES));

        expect(mockGetProvinces).toHaveBeenCalledTimes(1);
        expect(result.current.isLoadingProvinces).toBe(false);
    });

    test('las pide aunque no haya provincia elegida ni sucursal', async () => {
        mockGetProvinces.mockResolvedValue({ data: PROVINCES });
        const { result } = setup(1, null, null);

        await waitFor(() => expect(result.current.locationProvinces).toHaveLength(2));
    });

    test('si falta la propiedad data, usa una lista vacía', async () => {
        mockGetProvinces.mockResolvedValue({});
        const { result } = setup();

        await waitFor(() => expect(result.current.isLoadingProvinces).toBe(false));

        expect(result.current.locationProvinces).toEqual([]);
    });
});

describe('useLocations: cantones', () => {
    test.each([
        ['null', null],
        ['undefined', undefined],
    ])('no pide cantones cuando la provincia es %s', async (_label, provinceId) => {
        const { result } = setup(1, null, provinceId);

        await waitFor(() => expect(result.current.isLoadingProvinces).toBe(false));

        expect(mockGetCantons).not.toHaveBeenCalled();
        expect(result.current.locationCantons).toEqual([]);
        expect(result.current.isLoadingCantons).toBe(false);
    });

    test('con una provincia, pide sus cantones y los desenvuelve', async () => {
        mockGetCantons.mockResolvedValue({ data: CANTONS });
        const { result } = setup(1, null, 3);

        await waitFor(() => expect(result.current.locationCantons).toEqual(CANTONS));

        expect(mockGetCantons).toHaveBeenCalledWith(3);
        expect(result.current.isLoadingCantons).toBe(false);
    });

    test('al cambiar de provincia, pide los cantones de la nueva', async () => {
        mockGetCantons.mockResolvedValueOnce({ data: [CANTONS[0]] });
        const { result, rerender } = renderHook(
            ({ provinceId }) => useLocations(1, null, provinceId, {}),
            { wrapper, initialProps: { provinceId: 3 } },
        );
        await waitFor(() => expect(result.current.locationCantons).toEqual([CANTONS[0]]));

        mockGetCantons.mockResolvedValueOnce({ data: [CANTONS[1]] });
        rerender({ provinceId: 1 });

        await waitFor(() => expect(mockGetCantons).toHaveBeenCalledWith(1));
        await waitFor(() => expect(result.current.locationCantons).toEqual([CANTONS[1]]));
    });

    test('al pasar de "sin provincia" a una provincia, empieza a pedir cantones', async () => {
        mockGetCantons.mockResolvedValue({ data: CANTONS });
        const { result, rerender } = renderHook(
            ({ provinceId }) => useLocations(1, null, provinceId, {}),
            { wrapper, initialProps: { provinceId: null } },
        );
        expect(mockGetCantons).not.toHaveBeenCalled();

        rerender({ provinceId: 3 });

        await waitFor(() => expect(result.current.locationCantons).toEqual(CANTONS));
    });

    test('el error de cantones no rompe la lista de sucursales', async () => {
        mockGetCantons.mockRejectedValue(new Error('boom'));
        const { result } = setup(1, null, 3);

        await waitFor(() => expect(result.current.isLoadingCantons).toBe(false));

        expect(result.current.locationCantons).toEqual([]);
        await waitFor(() => expect(result.current.locations).toEqual(LOCATIONS));
    });
});