import { describe, expect, test } from '@jest/globals';
import { validateAll } from '../utils/snackFormValidation';

const VALID = {
    name: 'PALOMITAS',
    description: 'Palomitas con mantequilla',
    price: 2500,
};

describe('validateAll', () => {
    test('un snack completo no tiene errores', () => {
        expect(validateAll(VALID)).toEqual({});
    });

    test('un formulario vacío marca los tres campos', () => {
        const errors = validateAll({ name: '', description: '', price: null });

        expect(Object.keys(errors).sort()).toEqual(['PRICE', 'SNACK_DESCRIPTION', 'SNACK_NAME']);
    });

    test('el error de cada campo usa la clave del servidor', () => {
        const errors = validateAll({ name: '', description: '', price: null });

        expect(errors.SNACK_NAME).toBe('Campo obligatorio');
        expect(errors.SNACK_DESCRIPTION).toBe('Campo obligatorio');
        expect(errors.PRICE).toBe('Campo obligatorio');
    });


    test.each([
        ['vacío', ''],
        ['solo espacios', '   '],
    ])('rechaza un nombre %s', (_label, name) => {
        expect(Object.keys(validateAll({ ...VALID, name }))).toEqual(['SNACK_NAME']);
    });

    test('acepta un nombre de 50 caracteres y rechaza uno de 51', () => {
        expect(validateAll({ ...VALID, name: 'a'.repeat(50) })).toEqual({});
        expect(validateAll({ ...VALID, name: 'a'.repeat(51) })).toHaveProperty('SNACK_NAME');
    });

    test('los espacios de los extremos no cuentan para el largo', () => {
        expect(validateAll({ ...VALID, name: `  ${'a'.repeat(50)}  ` })).toEqual({});
    });

    test.each([
        ['vacía', ''],
        ['solo espacios', '   '],
    ])('rechaza una descripción %s', (_label, description) => {
        expect(Object.keys(validateAll({ ...VALID, description }))).toEqual(['SNACK_DESCRIPTION']);
    });

    test('acepta una descripción de 100 caracteres y rechaza una de 101', () => {
        expect(validateAll({ ...VALID, description: 'a'.repeat(100) })).toEqual({});
        expect(validateAll({ ...VALID, description: 'a'.repeat(101) })).toHaveProperty('SNACK_DESCRIPTION');
    });

    test.each([
        ['null', null],
        ['cero', 0],
        ['negativo', -5],
    ])('rechaza un precio %s, con la clave PRICE', (_label, price) => {
        expect(Object.keys(validateAll({ ...VALID, price }))).toEqual(['PRICE']);
    });

    test.each([[0.01], [1500.5], [2500]])('acepta el precio %s', (price) => {
        expect(validateAll({ ...VALID, price })).toEqual({});
    });

    test('un error en un campo no afecta a los demás', () => {
        const errors = validateAll({ ...VALID, price: 0 });

        expect(errors).not.toHaveProperty('SNACK_NAME');
        expect(errors).not.toHaveProperty('SNACK_DESCRIPTION');
    });
});