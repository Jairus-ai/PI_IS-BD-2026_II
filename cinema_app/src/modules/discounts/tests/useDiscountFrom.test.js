import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, cleanup, renderHook } from '@testing-library/react';


const mockUseDiscounts = jest.fn();
const mockShow = jest.fn();
const mockCreateDiscount = jest.fn();
const mockUpdateDiscount = jest.fn();
const mockValidateAll = jest.fn();
const mockMapDetail = jest.fn();
const mockBuildPayload = jest.fn();
const mockReadServerErrors = jest.fn();

const notificationsValue = { show: mockShow };

jest.unstable_mockModule('../hooks/useDiscounts', () => ({
    useDiscounts: mockUseDiscounts,
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
    default: () => notificationsValue,
}));
jest.unstable_mockModule('../utils/discountFormValidation', () => ({
    validateAll: mockValidateAll,
}));
jest.unstable_mockModule('../utils/discountFormHydration', () => ({
    mapDetailToFormValues: mockMapDetail,
}));
jest.unstable_mockModule('../utils/discountPayloadBuilder', () => ({
    buildDiscountPayload: mockBuildPayload,
}));
jest.unstable_mockModule('../utils/discountFormUtils', () => ({
    readServerErrors: mockReadServerErrors,
}));

const { useDiscountForm, DISCOUNT_TYPES } = await import('../hooks/useDiscountForm');


const SNACK = { ID_PRODUCT: 1, PRODUCT_NAME: 'Palomitas' };
const MOVIE = { ID_PRODUCT: 7, PRODUCT_NAME: 'DUNE from CINEPOLIS' };

const DETAIL = {
    DISCOUNT_NAME: 'AÑO_APERTURA',
    DISCOUNT_PORCENTAGE: 25,
    DISCOUNT_START_DATE: '2026-10-01',
    DISCOUNT_FINISH_DATE: '2027-10-05',
    TYPE: 'SNACK',
    ID_FK_PRODUCT: 1,
};
const HYDRATED = {
    name: 'AÑO_APERTURA',
    porcentage: 25,
    start_date: 'START',
    finish_date: 'FINISH',
    type: 'SNACK',
    id_prod: 1,
    prod_name: 'Palomitas',
};
const PAYLOAD = { DISCOUNT_NAME: 'AÑO_APERTURA' };

const FILLED = {
    name: 'NAVIDAD',
    porcentage: 15,
    start_date: 'START',
    finish_date: 'FINISH',
    type: 'SNACK',
    id_prod: 1,
    prod_name: 'Palomitas',
};

let onClose;
let onSaved;
let discountsState;

function setup({ discountId = null, open = true } = {}) {
    return renderHook(
        (props) => useDiscountForm(props),
        { initialProps: { discountId, open, onClose, onSaved } },
    );
}
function fillForm(result) {
    act(() => result.current.handleNameChange({ target: { value: FILLED.name } }));
    act(() => result.current.handlePorcentageChange({ target: { value: '15' } }));
    act(() => result.current.handleStartDateChange(FILLED.start_date));
    act(() => result.current.handleFinishDateChange(FILLED.finish_date));
    act(() => result.current.handleTypeChange('SNACK'));
    act(() => result.current.handleProductChange(SNACK));
}

const submitEvent = () => ({ preventDefault: jest.fn() });

const submit = async (result) => {
    await act(async () => {
        await result.current.handleSubmit(submitEvent());
    });
};

beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    onSaved = jest.fn();

    discountsState = {
        discountDetail: null,
        isLoadingDetail: false,
        discountProducts: [SNACK],
        isLoadingProducts: false,
        createDiscount: mockCreateDiscount,
        updateDiscount: mockUpdateDiscount,
        isCreatingDiscount: false,
        isUpdatingDiscount: false,
    };
    mockUseDiscounts.mockImplementation(() => discountsState);

    mockValidateAll.mockReturnValue({});
    mockMapDetail.mockReturnValue(HYDRATED);
    mockBuildPayload.mockReturnValue(PAYLOAD);
    mockReadServerErrors.mockReturnValue({});
    mockCreateDiscount.mockResolvedValue({ message: 'success' });
    mockUpdateDiscount.mockResolvedValue({ message: 'success' });
});

afterEach(cleanup);

describe('useDiscountForm: estado inicial', () => {
    test('al crear, el formulario arranca vacío, sin tipo ni producto', () => {
        const { result } = setup({ discountId: null });

        expect(result.current.isCreate).toBe(true);
        expect(result.current.values).toEqual({
            name: '',
            porcentage: null,
            start_date: null,
            finish_date: null,
            type: null,
            id_prod: null,
            prod_name: '',
        });
        expect(result.current.fieldErrors).toEqual({});
        expect(result.current.touched).toEqual({});
        expect(result.current.loading).toBe(false);
        expect(result.current.saving).toBe(false);
    });

    test('con un id, el modo es edición', () => {
        expect(setup({ discountId: 7 }).result.current.isCreate).toBe(false);
    });

    test('pide el detalle solo al editar con el diálogo abierto, y sin tipo al empezar', () => {
        setup({ discountId: null });
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null);

        setup({ discountId: 7, open: true });
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, 7, null);

        setup({ discountId: 7, open: false });
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null);
    });

    test('expone la lista de productos y su estado de carga', () => {
        discountsState.isLoadingProducts = true;

        const { result } = setup();

        expect(result.current.products).toEqual([SNACK]);
        expect(result.current.isLoadingProducts).toBe(true);
    });

    test('expone cada campo suelto, incluidos tipo y producto', () => {
        const { result } = setup();
        fillForm(result);

        expect(result.current.name).toBe('NAVIDAD');
        expect(result.current.porcentage).toBe(15);
        expect(result.current.start_date).toBe('START');
        expect(result.current.finish_date).toBe('FINISH');
        expect(result.current.type).toBe('SNACK');
        expect(result.current.id_prod).toBe(1);
        expect(result.current.prod_name).toBe('Palomitas');
    });

    test('DISCOUNT_TYPES contiene los dos tipos que entiende el backend', () => {
        expect(DISCOUNT_TYPES).toEqual(['SNACK', 'PELICULA']);
    });
});

describe('useDiscountForm: carga y guardado en curso', () => {
    test('loading solo aplica al editar', () => {
        discountsState.isLoadingDetail = true;

        expect(setup({ discountId: null }).result.current.loading).toBe(false);
        expect(setup({ discountId: 7 }).result.current.loading).toBe(true);
    });

    test.each([
        ['creando', { isCreatingDiscount: true }],
        ['actualizando', { isUpdatingDiscount: true }],
    ])('saving es true mientras se está %s', (_label, patch) => {
        Object.assign(discountsState, patch);

        expect(setup().result.current.saving).toBe(true);
    });
});

describe('useDiscountForm: al abrir', () => {
    test('al editar, rellena los valores con el detalle, incluido el tipo', () => {
        discountsState.discountDetail = DETAIL;

        const { result } = setup({ discountId: 7 });

        expect(mockMapDetail).toHaveBeenCalledWith(DETAIL);
        expect(result.current.values).toEqual(HYDRATED);
        expect(result.current.type).toBe('SNACK');
    });

    test('al editar, el tipo del detalle activa la consulta de productos', () => {
        discountsState.discountDetail = DETAIL;

        setup({ discountId: 7 });

        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, 7, 'SNACK');
    });

    test('mientras no llega el detalle, el formulario queda vacío', () => {
        const { result } = setup({ discountId: 7 });

        expect(mockMapDetail).not.toHaveBeenCalled();
        expect(result.current.values.name).toBe('');
        expect(result.current.type).toBeNull();
    });

    test('rellena el formulario cuando el detalle llega después', () => {
        const { result, rerender } = setup({ discountId: 7 });
        expect(result.current.values.name).toBe('');

        discountsState.discountDetail = DETAIL;
        rerender({ discountId: 7, open: true, onClose, onSaved });

        expect(result.current.values).toEqual(HYDRATED);
    });

    test('con el diálogo cerrado no toca el estado', () => {
        discountsState.discountDetail = DETAIL;

        const { result } = setup({ discountId: 7, open: false });

        expect(mockMapDetail).not.toHaveBeenCalled();
        expect(result.current.values.name).toBe('');
    });

    test('al reabrir limpia los errores y los campos tocados', () => {
        mockValidateAll.mockReturnValue({ DISCOUNT_NAME: 'Campo obligatorio' });
        const { result, rerender } = setup({ open: true });
        act(() => result.current.handleNameChange({ target: { value: '' } }));
        expect(result.current.fieldErrors).toEqual({ DISCOUNT_NAME: 'Campo obligatorio' });

        rerender({ discountId: null, open: false, onClose, onSaved });
        rerender({ discountId: null, open: true, onClose, onSaved });

        expect(result.current.fieldErrors).toEqual({});
        expect(result.current.touched).toEqual({});
    });
});

describe('useDiscountForm: cambios de campo', () => {
    test('el nombre se actualiza desde el evento del input', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'NAVIDAD' } }));

        expect(result.current.values.name).toBe('NAVIDAD');
    });

    test.each([
        ['un número', '15', 15],
        ['un decimal', '12.5', 12.5],
        ['cero (no se confunde con vacío)', '0', 0],
        ['vacío, que pasa a null', '', null],
    ])('el porcentaje %s', (_label, raw, expected) => {
        const { result } = setup();

        act(() => result.current.handlePorcentageChange({ target: { value: raw } }));

        expect(result.current.values.porcentage).toBe(expected);
    });

    test('un porcentaje que no es numérico queda como NaN, para que validateAll lo rechace', () => {
        const { result } = setup();

        act(() => result.current.handlePorcentageChange({ target: { value: 'abc' } }));

        expect(result.current.values.porcentage).toBeNaN();
    });

    test('las fechas se guardan tal como las entrega el picker', () => {
        const { result } = setup();

        act(() => result.current.handleStartDateChange('START'));
        act(() => result.current.handleFinishDateChange('FINISH'));

        expect(result.current.values).toMatchObject({ start_date: 'START', finish_date: 'FINISH' });
    });

    test('setFieldValue acepta cualquier campo del formulario', () => {
        const { result } = setup();

        act(() => result.current.setFieldValue('name', 'OTRO'));

        expect(result.current.values.name).toBe('OTRO');
    });

    test('marca el campo editado como tocado, con la clave del servidor', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'A' } }));
        act(() => result.current.handlePorcentageChange({ target: { value: '5' } }));
        act(() => result.current.handleStartDateChange('START'));
        act(() => result.current.handleFinishDateChange('FINISH'));

        expect(result.current.touched).toEqual({
            DISCOUNT_NAME: true,
            DISCOUNT_PORCENTAGE: true,
            DISCOUNT_START_DATE: true,
            DISCOUNT_FINISH_DATE: true,
        });
    });

    test('muestra el error solo de los campos tocados', () => {
        mockValidateAll.mockReturnValue({
            DISCOUNT_NAME: 'Campo obligatorio',
            ID_FK_PRODUCT: 'Producto es requerido',
        });
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: '' } }));

        expect(result.current.fieldErrors).toEqual({ DISCOUNT_NAME: 'Campo obligatorio' });
    });

    test('valida con los valores ya actualizados, no con los anteriores', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'NAVIDAD' } }));

        expect(mockValidateAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ name: 'NAVIDAD' }),
        );
    });

    test('el error desaparece cuando el campo pasa a ser válido', () => {
        mockValidateAll.mockReturnValue({ DISCOUNT_NAME: 'Campo obligatorio' });
        const { result } = setup();
        act(() => result.current.handleNameChange({ target: { value: '' } }));
        expect(result.current.fieldErrors.DISCOUNT_NAME).toBe('Campo obligatorio');

        mockValidateAll.mockReturnValue({});
        act(() => result.current.handleNameChange({ target: { value: 'NAVIDAD' } }));

        expect(result.current.fieldErrors).toEqual({});
    });
});

describe('useDiscountForm: tipo y producto', () => {
    test('elegir un tipo lo guarda y activa la consulta de sus productos', () => {
        const { result } = setup();

        act(() => result.current.handleTypeChange('SNACK'));

        expect(result.current.type).toBe('SNACK');
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, 'SNACK');
    });

    test('elegir un producto guarda su id y su nombre', () => {
        const { result } = setup();

        act(() => result.current.handleProductChange(MOVIE));

        expect(result.current.id_prod).toBe(7);
        expect(result.current.prod_name).toBe('DUNE from CINEPOLIS');
    });

    test('cambiar de tipo limpia el producto elegido', () => {
        const { result } = setup();
        act(() => result.current.handleTypeChange('SNACK'));
        act(() => result.current.handleProductChange(SNACK));
        expect(result.current.id_prod).toBe(1);

        act(() => result.current.handleTypeChange('PELICULA EN CARTELERA'));

        expect(result.current.type).toBe('PELICULA EN CARTELERA');
        expect(result.current.id_prod).toBeNull();
        expect(result.current.prod_name).toBe('');
    });

    test('quitar el tipo (null) también limpia el producto y desactiva la consulta', () => {
        const { result } = setup();
        act(() => result.current.handleTypeChange('SNACK'));
        act(() => result.current.handleProductChange(SNACK));

        act(() => result.current.handleTypeChange(null));

        expect(result.current.type).toBeNull();
        expect(result.current.id_prod).toBeNull();
        expect(mockUseDiscounts).toHaveBeenLastCalledWith(1, null, null);
    });

    test('quitar el producto (null) lo deja vacío, sin tocar el tipo', () => {
        const { result } = setup();
        act(() => result.current.handleTypeChange('SNACK'));
        act(() => result.current.handleProductChange(SNACK));

        act(() => result.current.handleProductChange(null));

        expect(result.current.id_prod).toBeNull();
        expect(result.current.prod_name).toBe('');
        expect(result.current.type).toBe('SNACK');
    });

    test('cambiar el tipo lo marca como tocado y valida con los valores nuevos', () => {
        mockValidateAll.mockReturnValue({ TYPE: 'Seleccione un tipo' });
        const { result } = setup();

        act(() => result.current.handleTypeChange(null));

        expect(result.current.touched).toEqual({ TYPE: true });
        expect(result.current.fieldErrors).toEqual({ TYPE: 'Seleccione un tipo' });
        expect(mockValidateAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ type: null, id_prod: null }),
        );
    });

    test('elegir un producto lo marca como tocado, con la clave del servidor', () => {
        const { result } = setup();

        act(() => result.current.handleProductChange(SNACK));

        expect(result.current.touched).toEqual({ ID_FK_PRODUCT: true });
    });
});

describe('useDiscountForm: handleBlur', () => {
    test('marca el campo como tocado y muestra su error', () => {
        mockValidateAll.mockReturnValue({ ID_FK_PRODUCT: 'Producto es requerido' });
        const { result } = setup();

        act(() => result.current.handleBlur('ID_FK_PRODUCT')());

        expect(result.current.touched).toEqual({ ID_FK_PRODUCT: true });
        expect(result.current.fieldErrors).toEqual({ ID_FK_PRODUCT: 'Producto es requerido' });
    });

    test('no muestra los errores de campos que no se tocaron', () => {
        mockValidateAll.mockReturnValue({
            ID_FK_PRODUCT: 'Producto es requerido',
            DISCOUNT_NAME: 'Campo obligatorio',
        });
        const { result } = setup();

        act(() => result.current.handleBlur('ID_FK_PRODUCT')());

        expect(result.current.fieldErrors).toEqual({ ID_FK_PRODUCT: 'Producto es requerido' });
    });

    test('valida con los valores actuales', () => {
        const { result } = setup();
        fillForm(result);

        act(() => result.current.handleBlur('TYPE')());

        expect(mockValidateAll).toHaveBeenLastCalledWith(expect.objectContaining(FILLED));
    });
});

describe('useDiscountForm: isValid', () => {
    test('es true cuando validateAll no devuelve errores', () => {
        mockValidateAll.mockReturnValue({});

        expect(setup().result.current.isValid).toBe(true);
    });

    test('es false cuando validateAll devuelve algún error', () => {
        mockValidateAll.mockReturnValue({ TYPE: 'Seleccione un tipo' });

        expect(setup().result.current.isValid).toBe(false);
    });
});

describe('useDiscountForm: handleSubmit', () => {
    test('evita el envío nativo del formulario', async () => {
        const { result } = setup();
        const event = submitEvent();

        await act(async () => {
            await result.current.handleSubmit(event);
        });

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    test('con errores: muestra todos, no envía y no cierra', async () => {
        const errors = {
            DISCOUNT_NAME: 'Campo obligatorio',
            TYPE: 'Seleccione un tipo',
        };
        mockValidateAll.mockReturnValue(errors);
        const { result } = setup();

        await submit(result);

        expect(result.current.fieldErrors).toEqual(errors);
        expect(result.current.touched).toEqual({
            DISCOUNT_NAME: true,
            DISCOUNT_PORCENTAGE: true,
            DISCOUNT_START_DATE: true,
            DISCOUNT_FINISH_DATE: true,
            TYPE: true,
            ID_FK_PRODUCT: true,
            NAME_FK_PRODUCT: true,
        });
        expect(mockCreateDiscount).not.toHaveBeenCalled();
        expect(mockUpdateDiscount).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('al crear: arma el payload, envía con el tipo, avisa, cierra y notifica', async () => {
        const { result } = setup({ discountId: null });
        fillForm(result);

        await submit(result);

        expect(mockBuildPayload).toHaveBeenCalledWith(expect.objectContaining(FILLED));
        expect(mockCreateDiscount).toHaveBeenCalledWith(PAYLOAD, 'SNACK');
        expect(mockUpdateDiscount).not.toHaveBeenCalled();
        expect(mockShow).toHaveBeenCalledWith('Descuento creado correctamente.', {
            severity: 'success',
            autoHideDuration: 5000,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(result.current.fieldErrors).toEqual({});
    });

    test('al crear, el tipo que viaja es el del formulario', async () => {
        const { result } = setup({ discountId: null });
        fillForm(result);
        act(() => result.current.handleTypeChange('PELICULA EN CARTELERA'));
        act(() => result.current.handleProductChange(MOVIE));

        await submit(result);

        expect(mockCreateDiscount).toHaveBeenCalledWith(PAYLOAD, 'PELICULA EN CARTELERA');
    });

    test('al editar: actualiza por id con el payload y el tipo', async () => {
        discountsState.discountDetail = DETAIL;
        const { result } = setup({ discountId: 7 });

        await submit(result);

        expect(mockUpdateDiscount).toHaveBeenCalledWith(7, PAYLOAD, 'SNACK');
        expect(mockCreateDiscount).not.toHaveBeenCalled();
        expect(mockShow).toHaveBeenCalledWith('Descuento actualizado correctamente.', {
            severity: 'success',
            autoHideDuration: 5000,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSaved).toHaveBeenCalledTimes(1);
    });

    test('funciona sin onSaved', async () => {
        const { result } = renderHook(() =>
            useDiscountForm({ discountId: null, open: true, onClose }),
        );

        await submit(result);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('si el servidor devuelve errores por campo, los muestra y no cierra', async () => {
        mockCreateDiscount.mockRejectedValue(new Error('400'));
        mockReadServerErrors.mockReturnValue({ DISCOUNT_NAME: 'Nombre duplicado' });
        const { result } = setup();

        await submit(result);

        expect(result.current.fieldErrors).toEqual({ DISCOUNT_NAME: 'Nombre duplicado' });
        expect(mockShow).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('si el error no trae detalle por campo, notifica el motivo', async () => {
        mockCreateDiscount.mockRejectedValue(new Error('Network Error'));
        const { result } = setup();

        await submit(result);

        expect(mockShow).toHaveBeenCalledWith(
            'Error al guardar el descuento: Network Error',
            { severity: 'error', autoHideDuration: 5000 },
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('el error de la actualización se trata igual que el de la creación', async () => {
        mockUpdateDiscount.mockRejectedValue(new Error('boom'));
        discountsState.discountDetail = DETAIL;
        const { result } = setup({ discountId: 7 });

        await submit(result);

        expect(mockShow).toHaveBeenCalledWith(
            'Error al guardar el descuento: boom',
            { severity: 'error', autoHideDuration: 5000 },
        );
    });
});