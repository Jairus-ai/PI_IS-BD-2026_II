import dayjs from 'dayjs';
import {validateAll} from '../utils/discountFormValidation';

const VALID = {
    start_date: dayjs('2026-06-01'),
    finish_date: dayjs('2026-06-30'),
    porcentage: 25,
    name: 'CUMPLEAÑOS',
    prod_name: 'Palomitas',
    id_prod: 3,
};

test('un descuento completo no tiene errores', () => {
    expect(validateAll(VALID)).toEqual({});
});

test('inicio y fin en el mismo día es válido', () => {
    expect(validateAll({ ...VALID, finish_date: VALID.start_date })).toEqual({});
});

test('inicio posterior al fin marca los dos campos', () => {
    const errors = validateAll({ ...VALID, start_date: dayjs('2026-07-01') });
    expect(Object.keys(errors).sort()).toEqual(['DISCOUNT_FINISH_DATE', 'DISCOUNT_START_DATE']);
});

test('con solo una fecha, no se compara: solo falta la otra', () => {
    expect(Object.keys(validateAll({ ...VALID, finish_date: null }))).toEqual(['DISCOUNT_FINISH_DATE']);
});

test.each([[NaN], [null], [0], [-5], [101]])('rechaza el porcentaje %s', (porcentage) => {
    expect(Object.keys(validateAll({ ...VALID, porcentage }))).toEqual(['DISCOUNT_PORCENTAGE']);
});

test('una fecha inválida se rechaza y no pasa en silencio', () => {
    const errors = validateAll({ ...VALID, start_date: dayjs('no es una fecha') });
    expect(errors).toHaveProperty('DISCOUNT_START_DATE');
});