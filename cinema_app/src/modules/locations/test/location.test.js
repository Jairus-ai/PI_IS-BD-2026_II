import {
    firstError,
    parseTime,
    readServerErrors,
    splitNames,
} from './locationFormUtils';
import {describe, expect, test } from '@jest/globals';
import '@testing-library/jest-dom/jest-globals';

describe('readServerErrors', () => {
    test('convierte los details del servidor en un mapa campo -> mensaje', () => {
        const error = {
            response: {
                data: {
                    details: [
                        { path: ['LOCATION_NAME'], message: 'Nombre duplicado' },
                        { path: ['OPENING_HOUR'], message: 'Hora inválida' },
                    ],
                },
            },
        };

        expect(readServerErrors(error)).toEqual({
            LOCATION_NAME: 'Nombre duplicado',
            OPENING_HOUR: 'Hora inválida',
        });
    });

    test('usa solo la primera parte del path como nombre del campo', () => {
        const error = {
            response: { data: { details: [{ path: ['CANTON_NAME', 'extra'], message: 'Inválido' }] } },
        };

        expect(readServerErrors(error)).toEqual({ CANTON_NAME: 'Inválido' });
    });

    test('si dos errores son del mismo campo, queda el último', () => {
        const error = {
            response: {
                data: {
                    details: [
                        { path: ['LOCATION_NAME'], message: 'Primero' },
                        { path: ['LOCATION_NAME'], message: 'Segundo' },
                    ],
                },
            },
        };

        expect(readServerErrors(error)).toEqual({ LOCATION_NAME: 'Segundo' });
    });

    test('ignora los details sin path', () => {
        const error = {
            response: { data: { details: [{ message: 'Sin campo' }, { path: [], message: 'Vacío' }] } },
        };

        expect(readServerErrors(error)).toEqual({});
    });

    test.each([
        ['undefined', undefined],
        ['null', null],
        ['un Error normal', new Error('Network Error')],
        ['una respuesta sin details', { response: { data: {} } }],
        ['details que no es un arreglo', { response: { data: { details: 'texto' } } }],
    ])('devuelve un objeto vacío con %s', (_label, error) => {
        expect(readServerErrors(error)).toEqual({});
    });
});

describe('parseTime', () => {
    test.each([
        ['08:30', 8, 30],
        ['8:05', 8, 5],
        ['00:00', 0, 0],
        ['23:59', 23, 59],
        ['07:00:00', 7, 0], 
        ['  21:15  ', 21, 15],
    ])('convierte "%s" a %i:%i', (value, hours, minutes) => {
        const result = parseTime(value);

        expect(result?.isValid()).toBe(true);
        expect(result?.hour()).toBe(hours);
        expect(result?.minute()).toBe(minutes);
    });

    test('devuelve la hora de hoy', () => {
        const result = parseTime('10:00');

        expect(result?.isSame(new Date(), 'day')).toBe(true);
    });

    test.each([
        ['null', null],
        ['undefined', undefined],
        ['vacío', ''],
        ['solo espacios', '   '],
        ['texto', 'abc'],
        ['sin minutos', '8'],
        ['hora fuera de rango', '24:00'],
        ['minutos fuera de rango', '08:60'],
        ['fecha ISO', '2026-01-01T14:00:00.000Z'],
    ])('devuelve null con %s', (_label, value) => {
        expect(parseTime(value)).toBeNull();
    });
});

describe('firstError', () => {
    test('devuelve el texto tal cual', () => {
        expect(firstError('Campo obligatorio')).toBe('Campo obligatorio');
    });

    test('devuelve el primer mensaje de un arreglo', () => {
        expect(firstError(['Primero', 'Segundo'])).toBe('Primero');
    });

    test.each([
        ['undefined', undefined],
        ['un arreglo vacío', []],
    ])('devuelve cadena vacía con %s', (_label, value) => {
        expect(firstError(value)).toBe('');
    });
});

describe('splitNames', () => {
    test('separa por comas y recorta los espacios', () => {
        expect(splitNames('Acción, Drama ,Comedia')).toEqual(['Acción', 'Drama', 'Comedia']);
    });

    test('descarta los elementos vacíos', () => {
        expect(splitNames('Acción,, ,Drama,')).toEqual(['Acción', 'Drama']);
    });

    test('devuelve un solo elemento si no hay comas', () => {
        expect(splitNames('Acción')).toEqual(['Acción']);
    });

    test.each([
        ['null', null],
        ['vacío', ''],
        ['solo comas y espacios', ' , , '],
    ])('devuelve un arreglo vacío con %s', (_label, value) => {
        expect(splitNames(value)).toEqual([]);
    });
});

