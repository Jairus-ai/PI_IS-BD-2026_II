import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
    api: {
        get: mockGet,
        post: mockPost,
        put: mockPut,
        delete: mockDelete,
    },
}));

const {
    getLocations,
    getLocationById,
    getLocationsCount,
    createLocation,
    getCantons,
    getProvinces,
    updateLocation,
    deleteLocation,
} = await import('../services/locationService');

beforeEach(() => {
    jest.clearAllMocks();
});


describe('getLocations', () => {
    test('pide la lista paginada y devuelve el cuerpo completo de la respuesta', async () => {
        const body = { data: [{ ID_LOCATION: 1 }] };
        mockGet.mockResolvedValue({ data: body });

        const result = await getLocations(2);

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('/management/locations/l/', {
            params: { page: 2 },
        });
        expect(result).toBe(body);
    });

    test('usa la página 1 por defecto', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getLocations();

        expect(mockGet).toHaveBeenCalledWith('/management/locations/l/', {
            params: { page: 1 },
        });
    });

    test('envía los filtros con valor junto a la página', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getLocations(3, { name: 'cine' });

        expect(mockGet).toHaveBeenCalledWith('/management/locations/l/', {
            params: { page: 3, name: 'cine' },
        });
    });

    test('descarta los filtros vacíos, nulos o indefinidos', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getLocations(1, { name: '', canton: null, province: undefined, active: 'yes' });

        expect(mockGet).toHaveBeenCalledWith('/management/locations/l/', {
            params: { page: 1, active: 'yes' },
        });
    });

    test('conserva los valores falsos que sí tienen significado (0 y false)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getLocations(1, { minRooms: 0, closed: false });

        expect(mockGet).toHaveBeenCalledWith('/management/locations/l/', {
            params: { page: 1, minRooms: 0, closed: false },
        });
    });

    test('un filtro llamado "page" pisa la página (efecto del spread)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getLocations(2, { page: 9 });

        expect(mockGet.mock.calls[0][1].params.page).toBe(9);
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Network Error'));

        await expect(getLocations()).rejects.toThrow('Network Error');
    });
});


describe('getLocationById', () => {
    test('pide el detalle por id y devuelve el cuerpo', async () => {
        const body = { data: { LOCATION_NAME: 'CINE CENTRO' } };
        mockGet.mockResolvedValue({ data: body });

        const result = await getLocationById(5);

        expect(mockGet).toHaveBeenCalledWith('/management/locations/5');
        expect(result).toBe(body);
    });

    test('propaga el 404 cuando la sucursal no existe', async () => {
        mockGet.mockRejectedValue(Object.assign(new Error('Request failed with status code 404'), {
            response: { status: 404 },
        }));

        await expect(getLocationById(999)).rejects.toThrow('404');
    });
});


describe('getLocationsCount', () => {
    test('pide el total sin parámetros cuando no hay filtros', async () => {
        const body = { total: 25 };
        mockGet.mockResolvedValue({ data: body });

        const result = await getLocationsCount();

        expect(mockGet).toHaveBeenCalledWith('/management/locations/count', { params: {} });
        expect(result).toBe(body);
    });

    test('envía solo los filtros con valor', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getLocationsCount({ name: 'cine', other: '', none: null });

        expect(mockGet).toHaveBeenCalledWith('/management/locations/count', {
            params: { name: 'cine' },
        });
    });

    test('no manda la página, porque el total no depende de ella', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getLocationsCount({ name: 'cine' });

        expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('page');
    });
});


describe('createLocation', () => {
    const payload = {
        LOCATION_NAME: 'CINE SUR',
        OPENING_HOUR: '08:30',
        CLOSING_HOUR: '22:00',
        CANTON_NAME: 'Cartago',
    };

    test('hace POST del payload y devuelve el cuerpo', async () => {
        const body = { message: 'success' };
        mockPost.mockResolvedValue({ data: body });

        const result = await createLocation(payload);

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith('/management/locations', payload);
        expect(result).toBe(body);
    });

    test('propaga el error del servidor', async () => {
        mockPost.mockRejectedValue(new Error('Request failed with status code 400'));

        await expect(createLocation(payload)).rejects.toThrow('400');
    });
});


describe('updateLocation', () => {
    test('hace PUT a la URL del id con el payload', async () => {
        const payload = { LOCATION_NAME: 'CINE SUR' };
        const body = { message: 'success' };
        mockPut.mockResolvedValue({ data: body });

        const result = await updateLocation(4, payload);

        expect(mockPut).toHaveBeenCalledWith('/management/locations/4', payload);
        expect(result).toBe(body);
    });

    test('propaga el error del servidor', async () => {
        mockPut.mockRejectedValue(new Error('Request failed with status code 500'));

        await expect(updateLocation(4, {})).rejects.toThrow('500');
    });
});

describe('deleteLocation', () => {
    test('hace DELETE a la URL del id y devuelve el cuerpo', async () => {
        mockDelete.mockResolvedValue({ data: undefined });

        const result = await deleteLocation(4);

        expect(mockDelete).toHaveBeenCalledWith('/management/locations/4');
        expect(result).toBeUndefined();
    });

    test('propaga el error cuando la sucursal está en uso', async () => {
        mockDelete.mockRejectedValue(new Error('Request failed with status code 409'));

        await expect(deleteLocation(4)).rejects.toThrow('409');
    });
});


describe('getProvinces', () => {
    test('pide la lista de provincias y devuelve el cuerpo completo', async () => {
        const body = { data: [{ ID_PROVINCE: 1, PROVINCE_NAME: 'San José' }] };
        mockGet.mockResolvedValue({ data: body });

        const result = await getProvinces();

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('/management/provinces');
        expect(result).toBe(body);
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Network Error'));

        await expect(getProvinces()).rejects.toThrow('Network Error');
    });
});

describe('getCantons', () => {
    test('pide los cantones de la provincia indicada y devuelve el cuerpo', async () => {
        const body = { data: [{ ID_CANTON: 9, CANTON_NAME: 'Paraíso' }] };
        mockGet.mockResolvedValue({ data: body });

        const result = await getCantons(3);

        expect(mockGet).toHaveBeenCalledWith('/management/cantons', {
            params: { provinceId: 3 },
        });
        expect(result).toBe(body);
    });

    test('sin provincia manda provinceId undefined (por eso el hook desactiva la consulta)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getCantons(undefined);

        expect(mockGet).toHaveBeenCalledWith('/management/cantons', {
            params: { provinceId: undefined },
        });
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Request failed with status code 500'));

        await expect(getCantons(3)).rejects.toThrow('500');
    });
});