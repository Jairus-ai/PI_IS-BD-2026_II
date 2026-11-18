import { beforeEach, describe, expect, jest, test } from '@jest/globals';


const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();

jest.unstable_mockModule('../../../services/api', () => ({
    api: {
        get: mockGet,
        post: mockPost,
        put: mockPut,
    },
}));

const {
    getDiscounts,
    getDiscountsCount,
    getDiscountsByID,
    getDiscountProducts,
    addDiscount,
    deleteDiscount,
    editDiscount,
} = await import('../services/discountService');

beforeEach(() => {
    jest.clearAllMocks();
});


describe('getDiscounts', () => {
    test('pide la lista paginada y devuelve el cuerpo completo de la respuesta', async () => {
        const body = { data: [{ ID_DISCOUNT: 1 }] };
        mockGet.mockResolvedValue({ data: body });

        const result = await getDiscounts(2);

        expect(mockGet).toHaveBeenCalledTimes(1);
        expect(mockGet).toHaveBeenCalledWith('/management/discounts/', { params: { page: 2 } });
        expect(result).toBe(body);
    });

    test('usa la página 1 por defecto', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getDiscounts();

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/', { params: { page: 1 } });
    });

    test('envía los filtros con valor junto a la página', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getDiscounts(3, { name: 'cumple' });

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/', {
            params: { page: 3, name: 'cumple' },
        });
    });

    test('descarta los filtros vacíos, nulos o indefinidos', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getDiscounts(1, { name: '', state: null, type: undefined, active: 'yes' });

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/', {
            params: { page: 1, active: 'yes' },
        });
    });

    test('conserva los valores falsos que sí tienen significado (0 y false)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getDiscounts(1, { minPercentage: 0, expired: false });

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/', {
            params: { page: 1, minPercentage: 0, expired: false },
        });
    });

    test('un filtro llamado "page" pisa la página (efecto del spread)', async () => {
        mockGet.mockResolvedValue({ data: {} });

        await getDiscounts(2, { page: 9 });

        expect(mockGet.mock.calls[0][1].params.page).toBe(9);
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Network Error'));

        await expect(getDiscounts()).rejects.toThrow('Network Error');
    });
});

describe('getDiscountsCount', () => {
    test('pide el total sin parámetros cuando no hay filtros', async () => {
        const body = { total: 25 };
        mockGet.mockResolvedValue({ data: body });

        const result = await getDiscountsCount();

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/count', { params: {} });
        expect(result).toBe(body);
    });

    test('envía solo los filtros con valor', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getDiscountsCount({ name: 'cumple', other: '', none: null });

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/count', {
            params: { name: 'cumple' },
        });
    });

    test('no manda la página, porque el total no depende de ella', async () => {
        mockGet.mockResolvedValue({ data: { total: 3 } });

        await getDiscountsCount({ name: 'cumple' });

        expect(mockGet.mock.calls[0][1].params).not.toHaveProperty('page');
    });

    test('propaga el error de la petición', async () => {
        mockGet.mockRejectedValue(new Error('Request failed with status code 500'));

        await expect(getDiscountsCount()).rejects.toThrow('500');
    });
});


describe('getDiscountsByID', () => {
    test('pide el detalle por id y devuelve el cuerpo completo', async () => {
        const body = { data: { ID_DISCOUNT: 4, DISCOUNT_NAME: 'AÑO_APERTURA' } };
        mockGet.mockResolvedValue({ data: body });

        const result = await getDiscountsByID(4);

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/4');
        expect(result).toBe(body);
    });

    test('propaga el 404 cuando el descuento no existe', async () => {
        mockGet.mockRejectedValue(new Error('Request failed with status code 404'));

        await expect(getDiscountsByID(999)).rejects.toThrow('404');
    });
});


describe('getDiscountProducts', () => {
    test('pide los productos del tipo indicado y devuelve solo la lista (data.data)', async () => {
        const products = [{ ID_PRODUCT: 1, PRODUCT_NAME: 'Palomitas' }];
        mockGet.mockResolvedValue({ data: { data: products } });

        const result = await getDiscountProducts('SNACK');

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/DP/SNACK');
        expect(result).toEqual(products);
    });

    test('codifica el tipo en la URL (el espacio de "PELICULA EN CARTELERA")', async () => {
        mockGet.mockResolvedValue({ data: { data: [] } });

        await getDiscountProducts('PELICULA EN CARTELERA');

        expect(mockGet).toHaveBeenCalledWith('/management/discounts/DP/PELICULA%20EN%20CARTELERA');
    });

    test('es la única función de lectura que desenvuelve la respuesta', async () => {
        mockGet.mockResolvedValue({ data: { data: ['x'] } });

        expect(await getDiscountProducts('SNACK')).toEqual(['x']);
        expect(await getDiscountsByID(1)).toEqual({ data: ['x'] });
    });

    test('propaga el 400 cuando el tipo no es válido', async () => {
        mockGet.mockRejectedValue(new Error('Request failed with status code 400'));

        await expect(getDiscountProducts('INVALIDO')).rejects.toThrow('400');
    });
});


describe('addDiscount', () => {
    const payload = {
        DISCOUNT_NAME: 'NAVIDAD',
        DISCOUNT_PORCENTAGE: 15,
        DISCOUNT_START_DATE: '2026-12-01',
        DISCOUNT_FINISH_DATE: '2026-12-31',
        ID_FK_PRODUCT: 1,
    };

    test('hace POST al tipo indicado con el payload y devuelve el cuerpo', async () => {
        const body = { message: 'success' };
        mockPost.mockResolvedValue({ data: body });

        const result = await addDiscount(payload, 'SNACK');

        expect(mockPost).toHaveBeenCalledTimes(1);
        expect(mockPost).toHaveBeenCalledWith('/management/discounts/SNACK', payload);
        expect(result).toBe(body);
    });

    test('codifica el tipo en la URL', async () => {
        mockPost.mockResolvedValue({ data: {} });

        await addDiscount(payload, 'PELICULA EN CARTELERA');

        expect(mockPost).toHaveBeenCalledWith(
            '/management/discounts/PELICULA%20EN%20CARTELERA',
            payload,
        );
    });

    test('sin tipo arma la URL con "undefined" (por eso el formulario debe exigirlo)', async () => {
        mockPost.mockResolvedValue({ data: {} });

        await addDiscount(payload);

        expect(mockPost).toHaveBeenCalledWith('/management/discounts/undefined', payload);
    });

    test('propaga el error del servidor', async () => {
        mockPost.mockRejectedValue(new Error('Request failed with status code 400'));

        await expect(addDiscount(payload, 'SNACK')).rejects.toThrow('400');
    });
});


describe('deleteDiscount', () => {
    test('hace PUT (no DELETE) a la URL del id, sin cuerpo', async () => {
        const body = { message: 'deleted' };
        mockPut.mockResolvedValue({ data: body });

        const result = await deleteDiscount(4);

        expect(mockPut).toHaveBeenCalledTimes(1);
        expect(mockPut).toHaveBeenCalledWith('/management/discounts/4');
        expect(result).toBe(body);
    });

    test('propaga el error del servidor', async () => {
        mockPut.mockRejectedValue(new Error('Request failed with status code 500'));

        await expect(deleteDiscount(4)).rejects.toThrow('500');
    });
});


describe('editDiscount', () => {
    const payload = { DISCOUNT_NAME: 'NAVIDAD', DISCOUNT_PORCENTAGE: 20 };

    test('hace PUT a /EDIT/:id/:tipo con el payload y devuelve el cuerpo', async () => {
        const body = { message: 'success' };
        mockPut.mockResolvedValue({ data: body });

        const result = await editDiscount(4, payload, 'SNACK');

        expect(mockPut).toHaveBeenCalledTimes(1);
        expect(mockPut).toHaveBeenCalledWith('/management/discounts/EDIT/4/SNACK', payload);
        expect(result).toBe(body);
    });

    test('codifica el tipo en la URL', async () => {
        mockPut.mockResolvedValue({ data: {} });

        await editDiscount(4, payload, 'PELICULA EN CARTELERA');

        expect(mockPut).toHaveBeenCalledWith(
            '/management/discounts/EDIT/4/PELICULA%20EN%20CARTELERA',
            payload,
        );
    });

    test('propaga el error del servidor', async () => {
        mockPut.mockRejectedValue(new Error('Request failed with status code 404'));

        await expect(editDiscount(4, payload, 'SNACK')).rejects.toThrow('404');
    });
});