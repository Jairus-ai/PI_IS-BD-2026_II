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

const DETAIL = { LOCATION_NAME: 'CINE CENTRO', OPENING_HOUR: '07:00', CLOSING_HOUR: '21:00', CANTON_NAME: 'San José' };
const HYDRATED = { name: 'CINE CENTRO', opening_hour: 'OPEN', closing_hour: 'CLOSE', canton_name: 'San José' };
const PAYLOAD = { LOCATION_NAME: 'CINE CENTRO' };

const FILLED = { name: 'CINE SUR', opening_hour: 'OPEN', closing_hour: 'CLOSE', canton_name: 'Cartago' };

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
    act(() => result.current.handleCantonChange({ target: { value: FILLED.canton_name } }));
}

const submitEvent = () => ({ preventDefault: jest.fn() });

beforeEach(() => {
    jest.clearAllMocks();
    onClose = jest.fn();
    onSaved = jest.fn();

    locationsState = {
        locationDetail: null,
        isLoadingDetail: false,
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
    test('al crear, el formulario arranca vacío', () => {
        const { result } = setup({ locationId: null });

        expect(result.current.isCreate).toBe(true);
        expect(result.current.values).toEqual({
            name: '',
            opening_hour: null,
            closing_hour: null,
            canton_name: '',
        });
        expect(result.current.fieldErrors).toEqual({});
        expect(result.current.touched).toEqual({});
        expect(result.current.loading).toBe(false);
        expect(result.current.saving).toBe(false);
    });

    test('con un id, el modo es edición', () => {
        const { result } = setup({ locationId: 7 });

        expect(result.current.isCreate).toBe(false);
    });

    test('al crear no pide el detalle; al editar sí, solo con el diálogo abierto', () => {
        setup({ locationId: null });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null);

        setup({ locationId: 7, open: true });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, 7);

        setup({ locationId: 7, open: false });
        expect(mockUseLocations).toHaveBeenLastCalledWith(1, null);
    });

    test('expone los valores sueltos de cada campo', () => {
        const { result } = setup();
        fillForm(result);

        expect(result.current.name).toBe('CINE SUR');
        expect(result.current.opening_hour).toBe('OPEN');
        expect(result.current.closing_hour).toBe('CLOSE');
        expect(result.current.canton_name).toBe('Cartago');
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
    test('al editar, rellena los valores con el detalle', () => {
        locationsState.locationDetail = DETAIL;

        const { result } = setup({ locationId: 7 });

        expect(mockMapDetail).toHaveBeenCalledWith(DETAIL);
        expect(result.current.values).toEqual(HYDRATED);
    });

    test('al editar, mientras no llega el detalle el formulario queda vacío', () => {
        locationsState.locationDetail = null;

        const { result } = setup({ locationId: 7 });

        expect(mockMapDetail).not.toHaveBeenCalled();
        expect(result.current.values.name).toBe('');
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

        act(() => result.current.handleCantonChange({ target: { value: 'Cartago' } }));
        expect(result.current.values).toMatchObject({ name: 'CINE SUR', canton_name: 'Cartago' });

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
            CANTON_NAME: 'Campo obligatorio',
        });
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: '' } }));

        expect(result.current.fieldErrors).toEqual({ LOCATION_NAME: 'Campo obligatorio' });
        expect(result.current.fieldErrors).not.toHaveProperty('CANTON_NAME');
    });

    test('valida con los valores ya actualizados, no con los anteriores', () => {
        const { result } = setup();

        act(() => result.current.handleNameChange({ target: { value: 'CINE SUR' } }));

        expect(mockValidateAll).toHaveBeenLastCalledWith(
            expect.objectContaining({ name: 'CINE SUR' }),
        );
    });

    test('el error desaparece cuando el campo pasa a ser válido', () => {
        mockValidateAll.mockReturnValueOnce({ LOCATION_NAME: 'Campo obligatorio' });
        const { result } = setup();
        act(() => result.current.handleNameChange({ target: { value: '' } }));
        expect(result.current.fieldErrors.LOCATION_NAME).toBe('Campo obligatorio');

        mockValidateAll.mockReturnValue({});
        act(() => result.current.handleNameChange({ target: { value: 'CINE SUR' } }));

        expect(result.current.fieldErrors).toEqual({});
    });
});

describe('useLocationForm: isValid', () => {
    test('es true cuando validateAll no devuelve errores', () => {
        mockValidateAll.mockReturnValue({});

        expect(setup().result.current.isValid).toBe(true);
    });

    test('es false cuando validateAll devuelve algún error', () => {
        mockValidateAll.mockReturnValue({ LOCATION_NAME: 'Campo obligatorio' });

        expect(setup().result.current.isValid).toBe(false);
    });
});

describe('useLocationForm: handleSubmit', () => {
    test('evita el envío nativo del formulario', async () => {
        const { result } = setup();
        const event = submitEvent();

        await act(() => result.current.handleSubmit(event));

        expect(event.preventDefault).toHaveBeenCalledTimes(1);
    });

    test('con errores de validación: muestra todos, no envía y no cierra', async () => {
        const errors = {
            LOCATION_NAME: 'Campo obligatorio',
            OPENING_HOUR: 'Seleccione la hora de apertura.',
        };
        mockValidateAll.mockReturnValue(errors);
        const { result } = setup();

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.fieldErrors).toEqual(errors);
        expect(result.current.touched).toEqual({
            LOCATION_NAME: true,
            OPENING_HOUR: true,
            CLOSING_HOUR: true,
            CANTON_NAME: true,
        });
        expect(mockCreateLocation).not.toHaveBeenCalled();
        expect(mockUpdateLocation).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('al crear: envía el payload, avisa, cierra y notifica el guardado', async () => {
        const { result } = setup({ locationId: null });
        fillForm(result);

        await act(() => result.current.handleSubmit(submitEvent()));

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

        await act(() => result.current.handleSubmit(submitEvent()));

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

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('si el servidor devuelve errores por campo, los muestra y no cierra', async () => {
        mockCreateLocation.mockRejectedValue(new Error('400'));
        mockReadServerErrors.mockReturnValue({ LOCATION_NAME: 'Nombre duplicado' });
        const { result } = setup();

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(result.current.fieldErrors).toEqual({ LOCATION_NAME: 'Nombre duplicado' });
        expect(mockShow).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    test('si el error no trae detalle por campo, notifica el motivo', async () => {
        mockCreateLocation.mockRejectedValue(new Error('Network Error'));
        mockReadServerErrors.mockReturnValue({});
        const { result } = setup();

        await act(() => result.current.handleSubmit(submitEvent()));

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

        await act(() => result.current.handleSubmit(submitEvent()));

        expect(mockShow).toHaveBeenCalledWith(
            'Error al guardar la sucursal: boom',
            { severity: 'error', autoHideDuration: 5000 },
        );
    });
});