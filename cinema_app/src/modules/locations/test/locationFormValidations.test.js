import { describe, expect, test } from '@jest/globals';
import dayjs from 'dayjs';
import { validateAll } from '../utils/locationFormValidation';
import { mapDetailToFormValues } from '../utils/locationFormHydration';
import { buildLocationPayload } from '../utils/locationPayloadBuilder';

const at = (hours, minutes = 0) => dayjs().startOf('day').hour(hours).minute(minutes);

const VALID = {
    name: 'CINE SUR',
    opening_hour: at(8, 30),
    closing_hour: at(22),
    province_id: 3,
    canton_name: 'Paraíso',
};

describe('validateAll', () => {
    test('un formulario completo no tiene errores', () => {
        expect(validateAll(VALID)).toEqual({});
    });

    test('un formulario vacío marca los cinco campos', () => {
        const errors = validateAll({
            name: '',
            opening_hour: null,
            closing_hour: null,
            province_id: null,
            canton_name: '',
        });

        expect(Object.keys(errors).sort()).toEqual([
            'CANTON_NAME',
            'CLOSING_HOUR',
            'LOCATION_NAME',
            'OPENING_HOUR',
            'PROVINCE_NAME',
        ]);
    });

    test.each([
        ['vacío', ''],
        ['solo espacios', '   '],
    ])('rechaza un nombre %s', (_label, name) => {
        expect(Object.keys(validateAll({ ...VALID, name }))).toEqual(['LOCATION_NAME']);
    });

    test('acepta un nombre de 30 caracteres y rechaza uno de 31', () => {
        expect(validateAll({ ...VALID, name: 'a'.repeat(30) })).toEqual({});
        expect(validateAll({ ...VALID, name: 'a'.repeat(31) })).toHaveProperty('LOCATION_NAME');
    });

    test.each([
        ['null', null],
        ['una hora inválida', dayjs('no es una hora')],
    ])('rechaza una hora de apertura %s', (_label, opening_hour) => {
        expect(Object.keys(validateAll({ ...VALID, opening_hour }))).toEqual(['OPENING_HOUR']);
    });

    test.each([
        ['null', null],
        ['una hora inválida', dayjs('no es una hora')],
    ])('rechaza una hora de cierre %s', (_label, closing_hour) => {
        expect(Object.keys(validateAll({ ...VALID, closing_hour }))).toEqual(['CLOSING_HOUR']);
    });

    test('rechaza una provincia sin elegir, pero acepta un id 0', () => {
        expect(Object.keys(validateAll({ ...VALID, province_id: null }))).toEqual(['PROVINCE_NAME']);
        expect(validateAll({ ...VALID, province_id: 0 })).toEqual({});
    });

    test.each([
        ['vacío', ''],
        ['solo espacios', '   '],
    ])('rechaza un cantón %s', (_label, canton_name) => {
        expect(Object.keys(validateAll({ ...VALID, canton_name }))).toEqual(['CANTON_NAME']);
    });
});

describe('mapDetailToFormValues', () => {
    const DETAIL = {
        ID_LOCATION: 5,
        LOCATION_NAME: 'CINE CENTRO',
        OPENING_HOUR: '07:00',
        CLOSING_HOUR: '21:30',
        CANTON_NAME: 'San José',
        ID_PROVINCE: 1,
        PROVINCE_NAME: 'San José',
    };

    test('convierte el detalle en los valores del formulario', () => {
        const values = mapDetailToFormValues(DETAIL);

        expect(values.name).toBe('CINE CENTRO');
        expect(values.canton_name).toBe('San José');
        expect(values.province_id).toBe(1);
        expect(values.opening_hour.format('HH:mm')).toBe('07:00');
        expect(values.closing_hour.format('HH:mm')).toBe('21:30');
    });

    test('devuelve exactamente los campos del formulario, sin los del servidor', () => {
        expect(Object.keys(mapDetailToFormValues(DETAIL)).sort()).toEqual([
            'canton_name',
            'closing_hour',
            'name',
            'opening_hour',
            'province_id',
        ]);
    });

    test('si el detalle no trae ID_PROVINCE, la provincia queda en null', () => {
        const { ID_PROVINCE: _omitted, ...withoutProvince } = DETAIL;

        expect(mapDetailToFormValues(withoutProvince).province_id).toBeNull();
    });

    test('rellena con valores vacíos lo que falte', () => {
        const values = mapDetailToFormValues({
            LOCATION_NAME: null,
            OPENING_HOUR: null,
            CLOSING_HOUR: null,
            CANTON_NAME: null,
        });

        expect(values).toEqual({
            name: '',
            opening_hour: null,
            closing_hour: null,
            province_id: null,
            canton_name: '',
        });
    });

    test('una hora con formato inesperado queda en null', () => {
        const values = mapDetailToFormValues({ ...DETAIL, OPENING_HOUR: '2026-01-01T14:00:00.000Z' });

        expect(values.opening_hour).toBeNull();
    });
});

describe('buildLocationPayload', () => {
    test('manda el id de la provincia y las horas como texto HH:mm', () => {
        expect(buildLocationPayload(VALID)).toEqual({
            LOCATION_NAME: 'CINE SUR',
            OPENING_HOUR: '08:30',
            CLOSING_HOUR: '22:00',
            ID_PROVINCE: 3,
            CANTON_NAME: 'Paraíso',
        });
    });

    test('recorta los espacios del nombre y del cantón', () => {
        const payload = buildLocationPayload({ ...VALID, name: '  CINE SUR ', canton_name: ' Paraíso ' });

        expect(payload.LOCATION_NAME).toBe('CINE SUR');
        expect(payload.CANTON_NAME).toBe('Paraíso');
    });

    test('conserva los minutos de la hora (no se reduce a un número)', () => {
        const payload = buildLocationPayload({ ...VALID, opening_hour: at(8, 5) });

        expect(payload.OPENING_HOUR).toBe('08:05');
        expect(typeof payload.OPENING_HOUR).toBe('string');
    });

    test('el cantón vacío sale como null, no como cadena vacía', () => {
        expect(buildLocationPayload({ ...VALID, canton_name: '   ' }).CANTON_NAME).toBeNull();
    });

    test.each([
        ['null', null],
        ['inválida', dayjs('no es una hora')],
    ])('una hora %s sale como null, no como 00:00', (_label, hour) => {
        const payload = buildLocationPayload({ ...VALID, opening_hour: hour, closing_hour: hour });

        expect(payload.OPENING_HOUR).toBeNull();
        expect(payload.CLOSING_HOUR).toBeNull();
    });

    test('la provincia sin elegir sale como null', () => {
        expect(buildLocationPayload({ ...VALID, province_id: null }).ID_PROVINCE).toBeNull();
    });
});