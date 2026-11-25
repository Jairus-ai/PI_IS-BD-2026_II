import { describe, expect, test } from '@jest/globals';
import { buildScreenPayload, getCapacity, validateRangeField, validateScreenForm } from '../validators/screenValidator';

const VALID = { locationId: 1, type: 'IMAX', rows: '10', seatsPerRow: '12', maintenanceTime: '15', addsTime: '0' };

describe('screenValidator', () => {
  test('A complete form has no errors', () => {
    expect(validateScreenForm(VALID)).toEqual({});
  });

  test('Every empty field shows "Campo obligatorio"', () => {
    expect(validateScreenForm({ locationId: '', type: '', rows: '', seatsPerRow: ' ', maintenanceTime: '', addsTime: '' })).toEqual({
      locationId: 'Campo obligatorio',
      type: 'Campo obligatorio',
      rows: 'Campo obligatorio',
      seatsPerRow: 'Campo obligatorio',
      maintenanceTime: 'Campo obligatorio',
      addsTime: 'Campo obligatorio'
    });
  });

  test.each([
    ['rows', '0', 'La cantidad de filas debe estar entre 1 y 26'],
    ['rows', '27', 'La cantidad de filas debe estar entre 1 y 26'],
    ['rows', '3.5', 'La cantidad de filas debe estar entre 1 y 26'],
    ['seatsPerRow', '31', 'Los asientos por fila deben estar entre 1 y 30'],
    ['seatsPerRow', 'abc', 'Los asientos por fila deben estar entre 1 y 30'],
    ['maintenanceTime', '31', 'El tiempo de mantenimiento debe estar entre 0 y 30 minutos'],
    ['addsTime', '-2', 'El tiempo de anuncios debe estar entre 0 y 30 minutos']
  ])('%s = %p shows its range message', (field, value, message) => {
    expect(validateRangeField(field, value)).toBe(message);
  });

  test('Accepts the limits of every range', () => {
    expect(validateScreenForm({ ...VALID, rows: '26', seatsPerRow: '30', maintenanceTime: '0', addsTime: '30' })).toEqual({});
    expect(validateScreenForm({ ...VALID, rows: '1', seatsPerRow: '1' })).toEqual({});
  });

  test('The capacity is rows by seats per row, only with valid values', () => {
    expect(getCapacity('10', '12')).toBe(120);
    expect(getCapacity('', '12')).toBeNull();
    expect(getCapacity('27', '12')).toBeNull();
  });

  test('Builds the payload with numbers', () => {
    expect(buildScreenPayload(VALID)).toEqual({ locationId: 1, type: 'IMAX', rows: 10, seatsPerRow: 12, maintenanceTime: 15, addsTime: 0 });
  });
});
