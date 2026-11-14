import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, cleanup, renderHook } from '@testing-library/react';


const mockUseLocations = jest.fn();
const mockShow = jest.fn();
const mockCreateLocation = jest.fn();
const mockUpdateLocation = jest.fn();
const mockValidateAll = jest.fn();
const mockMapDetail = jest.fn();
const mockBuildPayload = jest.fn();
const mockReadServerErrors = jest.fn();

const notificationsValue = { show: mockShow };

jest.unstable_mockModule('../hooks/useLocations', () => ({
    useLocations: mockUseLocations,
}));
jest.unstable_mockModule('../../../hooks/useNotifications', () => ({
    default: () => notificationsValue,
}));
jest.unstable_mockModule('../utils/locationFormValidation', () => ({
    validateAll: mockValidateAll,
}));
jest.unstable_mockModule('../utils/locationFormHydration', () => ({
    mapDetailToFormValues: mockMapDetail,
}));
jest.unstable_mockModule('../utils/locationPayloadBuilder', () => ({
    buildLocationPayload: mockBuildPayload,
}));
jest.unstable_mockModule('../utils/locationFormUtils', () => ({
    readServerErrors: mockReadServerErrors,
}));

const { useLocationForm } = await import('../hooks/useLocationForm');

const PROVINCES = [
    { ID_PROVINCE: 1, PROVINCE_NAME: 'San José' },
    { ID_PROVINCE: 3, PROVINCE_NAME: 'Cartago' },
];
const CANTONS = [
    { ID_CANTON: 9, CANTON_NAME: 'Paraíso' },
    { ID_CANTON: 10, CANTON_NAME: 'Turrialba' },
];

const DETAIL = {
    LOCATION_NAME: 'CINE CENTRO',
    OPENING_HOUR: '07:00',
    CLOSING_HOUR: '21:00',
    ID_PROVINCE: 1,
    CANTON_NAME: 'San José',
};
const HYDRATED = {
    name: 'CINE CENTRO',
    opening_hour: 'OPEN',
    closing_hour: 'CLOSE',
    province_id: 1,
    canton_name: 'San José',
};
const PAYLOAD = { LOCATION_NAME: 'CINE CENTRO' };

const FILLED = {
    name: 'CINE SUR',
    opening_hour: 'OPEN',
    closing_hour: 'CLOSE',
    province_id: 3,
    canton_name: 'Paraíso',
};

let onClose;
let onSaved;
let locationsState;

function setup({ locationId = null, open = true } = {}) {
    return renderHook(
        (props) => useLocationForm(props),
        { initialProps: { locationId, open, onClose, onSaved } },
    );
}

function fillForm(result) {
    act(() => result.current.handleNameChange({ target: { value: FILLED.name } }));
    act(() => result.current.handleOpHourChange(FILLED.opening_hour));
    act(() => result.current.handleCloseHourChange(FILLED.closing_hour));
    act(() => result.current.handleProvinceChange(PROVINCES[1]));
    act(() => result.current.handleCantonChange(CANTONS[0]));
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

    locationsState = {
        locationDetail: null,
        isLoadingDetail: false,
        locationProvinces: PROVINCES,
        locationCantons: CANTONS,
        isLoadingProvinces: false,
        isLoadingCantons: false,
        createLocation: mockCreateLocation,
        updateLocation: mockUpdateLocation,
        isCreatingLocation: false,
        isUpdatingLocation: false,
    };
    mockUseLocations.mockImplementation(() => locationsState);

    mockValidateAll.mockReturnValue({});
    mockMapDetail.mockReturnValue(HYDRATED);
    mockBuildPayload.mockReturnValue(PAYLOAD);
    mockReadServerErrors.mockReturnValue({});
    mockCreateLocation.mockResolvedValue({ message: 'success' });
    mockUpdateLocation.mockResolvedValue({ message: 'success' });
});

afterEach(cleanup);

describe('useLocationForm: estado inicial', () => {
    test('al crear, el formulario arranca vacío, sin provincia', () => {
        const { result } = setup({ locationId: null });

        expect(result.current.isCreate).toBe(true);
        expect(result.current.values).toEqual({
            name: '',
            opening_hour: null,
            closing_hour: null,
            province_id: null,
            canton_name: '',
        });
        expect(result.current.province_id).toBeNull();
        expect(result.current.fieldErrors).toEqual({});
        expect(result.current.touched).toEqual({});
        expect(result.current.loading).toBe(false);
        expect(result.current.saving).toBe(false);
    });

    test('con un id, el modo es edición', () => {
        expect(setup({ locationId: 7 }).result.current.isCreate).toBe(false);
    });

    test('pide el detalle solo al editar con el diálogo abierto, y sin provincia al empezar', () => {
        setup({ locationId: null });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null);

        setup({ locationId: 7, open: true });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, 7, null);

        setup({ locationId: 7, open: false });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null);
    });

    test('expone las listas y los estados de carga de provincias y cantones', () => {
        locationsState.isLoadingProvinces = true;
        locationsState.isLoadingCantons = true;

        const { result } = setup();

        expect(result.current.provinces).toEqual(PROVINCES);
        expect(result.current.cantons).toEqual(CANTONS);
        expect(result.current.isLoadingProvinces).toBe(true);
        expect(result.current.isLoadingCantons).toBe(true);
    });

    test('expone cada campo suelto, incluida la provincia que lee el Autocomplete', () => {
        const { result } = setup();
        fillForm(result);

        expect(result.current.name).toBe('CINE SUR');
        expect(result.current.opening_hour).toBe('OPEN');
        expect(result.current.closing_hour).toBe('CLOSE');
        expect(result.current.province_id).toBe(3);
        expect(result.current.canton_name).toBe('Paraíso');
    });
});

describe('useLocationForm: carga y guardado en curso', () => {
    test('loading solo aplica al editar', () => {
        locationsState.isLoadingDetail = true;

        expect(setup({ locationId: null }).result.current.loading).toBe(false);
        expect(setup({ locationId: 7 }).result.current.loading).toBe(true);
    });

    test.each([
        ['creando', { isCreatingLocation: true }],
        ['actualizando', { isUpdatingLocation: true }],
    ])('saving es true mientras se está %s', (_label, patch) => {
        Object.assign(locationsState, patch);

        expect(setup().result.current.saving).toBe(true);
    });
});


describe('useLocationForm: al abrir', () => {
    test('al editar, rellena los valores con el detalle, incluida la provincia', () => {
        locationsState.locationDetail = DETAIL;

        const { result } = setup({ locationId: 7 });

        expect(mockMapDetail).toHaveBeenCalledWith(DETAIL);
        expect(result.current.values).toEqual(HYDRATED);
        expect(result.current.province_id).toBe(1);
    });

    test('al editar, la provincia del detalle activa la consulta de cantones', () => {
        locationsState.locationDetail = DETAIL;

        setup({ locationId: 7 });

        expect(mockUseLocations).toHaveBeenLastCalledWith(1, 7, 1);
    });

    test('mientras no llega el detalle, el formulario queda vacío', () => {
        const { result } = setup({ locationId: 7 });

        expect(mockMapDetail).not.toHaveBeenCalled();
        expect(result.current.values.name).toBe('');
        expect(result.current.province_id).toBeNull();
    });

    test('rellena el formulario cuando el detalle llega después', () => {
        const { result, rerender } = setup({ locationId: 7 });
        expect(result.current.values.name).toBe('');

        locationsState.locationDetail = DETAIL;
        rerender({ locationId: 7, open: true, onClose, onSaved });

        expect(result.current.values).toEqual(HYDRATED);
    });

    test('con el diálogo cerrado no toca el estado', () => {
        locationsState.locationDetail = DETAIL;

        const { result } = setup({ locationId: 7, open: false });

        expect(mockMapDetail).not.toHaveBeenCalled();
        expect(result.current.values.name).toBe('');
    });

    test('al reabrir limpia los errores y los campos tocados', () => {
        mockValidateAll.mockReturnValue({ LOCATION_NAME: 'Campo obligatorio' });
        const { result, rerender } = setup({ open: true });
        act(() => result.current.handleNameChange({ target: { value: '' } }));
        expect(result.current.fieldErrors).toEqual({ LOCATION_NAME: 'Campo obligatorio' });

        rerender({ locationId: null, open: false, onClose, onSaved });
        rerender({ locationId: null, open: true, onClose, onSaved });

        expect(result.current.fieldErrors).toEqual({});
        expect(result.current.touched).toEqual({});
    });
});

describe('useLocationForm: cambios de campo', () => {
    test('cada handler actualiza solo su campo', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'CINE SUR' } }));
        expect(result.current.values).toMatchObject({ name: 'CINE SUR', canton_name: '' });

        act(() => result.current.handleOpHourChange('OPEN'));
        act(() => result.current.handleCloseHourChange('CLOSE'));
        expect(result.current.values).toMatchObject({ opening_hour: 'OPEN', closing_hour: 'CLOSE' });
    });

    test('setFieldValue acepta cualquier campo del formulario', () => {
        const { result } = setup();

        act(() => result.current.setFieldValue('name', 'OTRO'));

        expect(result.current.values.name).toBe('OTRO');
    });

    test('marca el campo editado como tocado, con la clave del servidor', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'A' } }));
        act(() => result.current.handleOpHourChange('OPEN'));

        expect(result.current.touched).toEqual({ LOCATION_NAME: true, OPENING_HOUR: true });
    });

    test('muestra el error solo de los campos tocados', () => {
        mockValidateAll.mockReturnValue({
            LOCATION_NAME: 'Campo obligatorio',
            CANTON_NAME: 'Seleccione un cantón.',
        });
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: '' } }));

        expect(result.current.fieldErrors).toEqual({ LOCATION_NAME: 'Campo obligatorio' });
    });

    test('valida con los valores ya actualizados, no con los anteriores', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'CINE SUR' } }));

        expect(mockValidateAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ name: 'CINE SUR' }),
        );
    });

    test('el error desaparece cuando el campo pasa a ser válido', () => {
        mockValidateAll.mockReturnValue({ LOCATION_NAME: 'Campo obligatorio' });
        const { result } = setup();
        act(() => result.current.handleNameChange({ target: { value: '' } }));
        expect(result.current.fieldErrors.LOCATION_NAME).toBe('Campo obligatorio');

        mockValidateAll.mockReturnValue({});
        act(() => result.current.handleNameChange({ target: { value: 'CINE SUR' } }));

        expect(result.current.fieldErrors).toEqual({});
    });
});

describe('useLocationForm: provincia y cantón', () => {
    test('elegir una provincia guarda su id, no su nombre', () => {
        const { result } = setup();

        act(() => result.current.handleProvinceChange(PROVINCES[1]));

        expect(result.current.values.province_id).toBe(3);
        expect(result.current.province_id).toBe(3);
    });

    test('elegir una provincia activa la consulta de cantones de esa provincia', () => {
        const { result } = setup();

        act(() => result.current.handleProvinceChange(PROVINCES[1]));

        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, 3);
    });

    test('elegir una provincia limpia el cantón anterior', () => {
        const { result } = setup();
        act(() => result.current.handleProvinceChange(PROVINCES[0]));
        act(() => result.current.handleCantonChange(CANTONS[0]));
        expect(result.current.canton_name).toBe('Paraíso');

        act(() => result.current.handleProvinceChange(PROVINCES[1]));

        expect(result.current.canton_name).toBe('');
        expect(result.current.province_id).toBe(3);
    });

    test('quitar la provincia deja el id en null y desactiva la consulta de cantones', () => {
        const { result } = setup();
        act(() => result.current.handleProvinceChange(PROVINCES[1]));

        act(() => result.current.handleProvinceChange(null));

        expect(result.current.province_id).toBeNull();
        expect(result.current.canton_name).toBe('');
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null, null);
    });

    test('cambiar la provincia la marca como tocada y valida con los valores nuevos', () => {
        mockValidateAll.mockReturnValue({ PROVINCE_NAME: 'Seleccione una provincia.' });
        const { result } = setup();

        act(() => result.current.handleProvinceChange(null));

        expect(result.current.touched).toEqual({ PROVINCE_NAME: true });
        expect(result.current.fieldErrors).toEqual({ PROVINCE_NAME: 'Seleccione una provincia.' });
        expect(mockValidateAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ province_id: null, canton_name: '' }),
        );
    });

    test('elegir un cantón guarda su nombre y lo marca como tocado', () => {
        const { result } = setup();

        act(() => result.current.handleCantonChange(CANTONS[1]));

        expect(result.current.values.canton_name).toBe('Turrialba');
        expect(result.current.touched).toEqual({ CANTON_NAME: true });
    });

    test('limpiar el cantón (null) lo deja como cadena vacía, nunca null', () => {
        const { result } = setup();
        act(() => result.current.handleCantonChange(CANTONS[0]));

        act(() => result.current.handleCantonChange(null));

        expect(result.current.values.canton_name).toBe('');
    });

    test('cambiar el cantón no altera la provincia elegida', () => {
        const { result } = setup();
        act(() => result.current.handleProvinceChange(PROVINCES[1]));

        act(() => result.current.handleCantonChange(CANTONS[0]));

        expect(result.current.province_id).toBe(3);
    });
});

describe('useLocationForm: handleBlur', () => {
    test('marca el campo como tocado y muestra su error', () => {
        mockValidateAll.mockReturnValue({ CANTON_NAME: 'Seleccione un cantón.' });
        const { result } = setup();

        act(() => result.current.handleBlur('CANTON_NAME')());

        expect(result.current.touched).toEqual({ CANTON_NAME: true });
        expect(result.current.fieldErrors).toEqual({ CANTON_NAME: 'Seleccione un cantón.' });
    });

    test('no muestra los errores de campos que no se tocaron', () => {
        mockValidateAll.mockReturnValue({
            CANTON_NAME: 'Seleccione un cantón.',
            LOCATION_NAME: 'Campo obligatorio',
        });
        const { result } = setup();

        act(() => result.current.handleBlur('CANTON_NAME')());

        expect(result.current.fieldErrors).toEqual({ CANTON_NAME: 'Seleccione un cantón.' });
    });

    test('valida con los valores actuales', () => {
        const { result } = setup();
        fillForm(result);

        act(() => result.current.handleBlur('PROVINCE_NAME')());

        expect(mockValidateAll).toHaveBeenLastCalledWith(expect.objectContaining(FILLED));
    });
});

describe('useLocationForm: isValid', () => {
    test('es true cuando validateAll no devuelve errores', () => {
        mockValidateAll.mockReturnValue({});

        expect(setup().result.current.isValid).toBe(true);
    });

    test('es false cuando validateAll devuelve algún error', () => {
        mockValidateAll.mockReturnValue({ PROVINCE_NAME: 'Seleccione una provincia.' });

        expect(setup().result.current.isValid).toBe(false);
    });
});

describe('useLocationForm: handleSubmit', () => {
    test('evita el envío nativo del formulario', async () => {
        const { result } = setup();
        const event = submitEvent();

        await act(async () => {
            await result.current.handleSubmit(event);
        });

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    test('con errores: muestra todos (provincia incluida), no envía y no cierra', async () => {
        const errors = {
            LOCATION_NAME: 'Campo obligatorio',
            PROVINCE_NAME: 'Seleccione una provincia.',
        };
        mockValidateAll.mockReturnValue(errors);
        const { result } = setup();

        await submit(result);

        expect(result.current.fieldErrors).toEqual(errors);
        expect(result.current.touched).toEqual({
            LOCATION_NAME: true,
            OPENING_HOUR: true,
            CLOSING_HOUR: true,
            PROVINCE_ID: true,
            CANTON_NAME: true,
        });
        expect(mockCreateLocation).not.toHaveBeenCalled();
        expect(mockUpdateLocation).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('al crear: arma el payload con la provincia, envía, avisa, cierra y notifica', async () => {
        const { result } = setup({ locationId: null });
        fillForm(result);

        await submit(result);

        expect(mockBuildPayload).toHaveBeenCalledWith(expect.objectContaining(FILLED));
        expect(mockCreateLocation).toHaveBeenCalledWith(PAYLOAD);
        expect(mockUpdateLocation).not.toHaveBeenCalled();
        expect(mockShow).toHaveBeenCalledWith('Sucursal creada correctamente.', {
            severity: 'success',
            autoHideDuration: 5000,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSaved).toHaveBeenCalledTimes(1);
        expect(result.current.fieldErrors).toEqual({});
    });

    test('al editar: actualiza por id con el payload', async () => {
        locationsState.locationDetail = DETAIL;
        const { result } = setup({ locationId: 7 });

        await submit(result);

        expect(mockUpdateLocation).toHaveBeenCalledWith(7, PAYLOAD);
        expect(mockCreateLocation).not.toHaveBeenCalled();
        expect(mockShow).toHaveBeenCalledWith('Sucursal actualizada correctamente.', {
            severity: 'success',
            autoHideDuration: 5000,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSaved).toHaveBeenCalledTimes(1);
    });

    test('funciona sin onSaved', async () => {
        const { result } = renderHook(() =>
            useLocationForm({ locationId: null, open: true, onClose }),
        );

        await submit(result);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('si el servidor devuelve errores por campo, los muestra y no cierra', async () => {
        mockCreateLocation.mockRejectedValue(new Error('400'));
        mockReadServerErrors.mockReturnValue({ LOCATION_NAME: 'Nombre duplicado' });
        const { result } = setup();

        await submit(result);

        expect(result.current.fieldErrors).toEqual({ LOCATION_NAME: 'Nombre duplicado' });
        expect(mockShow).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('si el error no trae detalle por campo, notifica el motivo', async () => {
        mockCreateLocation.mockRejectedValue(new Error('Network Error'));
        const { result } = setup();

        await submit(result);

        expect(mockShow).toHaveBeenCalledWith(
            'Error al guardar la sucursal: Network Error',
            { severity: 'error', autoHideDuration: 5000 },
        );
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('el error de la actualización se trata igual que el de la creación', async () => {
        mockUpdateLocation.mockRejectedValue(new Error('boom'));
        locationsState.locationDetail = DETAIL;
        const { result } = setup({ locationId: 7 });

        await submit(result);

        expect(mockShow).toHaveBeenCalledWith(
            'Error al guardar la sucursal: boom',
            { severity: 'error', autoHideDuration: 5000 },
        );
    });
});