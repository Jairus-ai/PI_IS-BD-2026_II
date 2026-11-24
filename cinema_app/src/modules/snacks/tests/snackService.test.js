import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
    api: { get: mockGet },
}));

const { getSnacks, getSnackById, getSnacksCount } = await import('../services/snackService');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('getSnacks', () => {
    test('pide la lista paginada y devuelve el cuerpo completo', async () => {
        const body = { data: [{ ID_SNACK: 1 }] };
        mockGet.mockResolvedValue({ data: body });

        const result = await getSnacks(2);

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('/management/snacks/', { params: { page: 2 } });
        expect(result).toBe(body);
    });

    test('usa la página 1 por defecto', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getSnacks();

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/', { params: { page: 1 } });
    });

    test('envía los filtros con valor junto a la página', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getSnacks(3, { name: 'palo' });

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/', {
            params: { page: 3, name: 'palo' },
        });
    });

    test('descarta los filtros vacíos, nulos o indefinidos', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getSnacks(1, { name: '', category: null, brand: undefined, active: 'yes' });

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/', {
            params: { page: 1, active: 'yes' },
        });
    });

    test('conserva los valores falsos que sí tienen significado (0 y false)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getSnacks(1, { minPrice: 0, soldOut: false });

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/', {
            params: { page: 1, minPrice: 0, soldOut: false },
        });
    });

    test('un filtro llamado "page" pisa la página (efecto del spread)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getSnacks(2, { page: 9 });

        expect(mockGet.mock.calls[0][1].params.page).toBe(9);
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Network Error'));

        await expect(getSnacks()).rejects.toThrow('Network Error');
    });
});

describe('getSnackById', () => {
    test('pide el detalle por id y devuelve el cuerpo completo', async () => {
        const body = { data: { ID_SNACK: 5, SNACK_NAME: 'PALOMITAS' } };
        mockGet.mockResolvedValue({ data: body });

        const result = await getSnackById(5);

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/5');
        expect(result).toBe(body);
    });

    test('propaga el 404 cuando el snack no existe', async () => {
        mockGet.mockRejectedValue(new Error('Request failed with status code 404'));

        await expect(getSnackById(999)).rejects.toThrow('404');
    });
});

describe('getSnacksCount', () => {
    test('pide el total sin parámetros cuando no hay filtros', async () => {
        const body = { total: 12 };
        mockGet.mockResolvedValue({ data: body });

        const result = await getSnacksCount();

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/count', { params: {} });
        expect(result).toBe(body);
    });

    test('envía solo los filtros con valor', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getSnacksCount({ name: 'palo', other: '', none: null });

        expect(mockGet).toHaveBeenCalledWith('/management/snacks/count', {
            params: { name: 'palo' },
        });
    });

    test('no manda la página, porque el total no depende de ella', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getSnacksCount({ name: 'palo' });

        expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('page');
    });
});