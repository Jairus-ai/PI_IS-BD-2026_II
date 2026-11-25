import { describe, expect, test } from '@jest/globals';
import {
  NAME_MESSAGE,
  PHONE_MESSAGE,
  REQUIRED_MESSAGE,
  cleanFormValues,
  getProfileChanges,
  toFormValues,
  validateProfileForm
} from '../utils/profileForm';
import { formatBirthdate, getLocationsLabel } from '../types/profile';

const ORIGINAL = { firstName: 'Laura', middleName: '', firstSurname: 'Vega', lastSurname: 'Mora', phoneNumber: '88881234' };

describe('validateProfileForm', () => {
  test('Accepts valid names with accents, ñ and spaces', () => {
    expect(validateProfileForm({ ...ORIGINAL, firstName: 'María José', lastSurname: 'Núñez' }, ORIGINAL)).toEqual({});
  });

  test.each([
    ['firstName', '', REQUIRED_MESSAGE],
    ['firstSurname', '   ', REQUIRED_MESSAGE],
    ['phoneNumber', '', REQUIRED_MESSAGE],
    ['firstName', 'Laura2', NAME_MESSAGE],
    ['middleName', 'Ana!', NAME_MESSAGE],
    ['lastSurname', 'Mora-Rojas', NAME_MESSAGE],
    ['phoneNumber', '8888123', PHONE_MESSAGE],
    ['phoneNumber', '888812345', PHONE_MESSAGE],
    ['phoneNumber', '8888abcd', PHONE_MESSAGE]
  ])('%s = "%s" shows "%s"', (field, value, message) => {
    expect(validateProfileForm({ ...ORIGINAL, [field]: value }, ORIGINAL)[field]).toBe(message);
  });

  test('Optional names can stay empty', () => {
    expect(validateProfileForm({ ...ORIGINAL, middleName: '', lastSurname: '' }, ORIGINAL)).toEqual({});
  });

  test('An unchanged phone with another format does not block the form', () => {
    const original = { ...ORIGINAL, phoneNumber: '+50688881234' };
    expect(validateProfileForm({ ...original, firstName: 'Lauren' }, original)).toEqual({});
  });
});

describe('getProfileChanges', () => {
  test('Returns no changes when nothing was modified', () => {
    expect(getProfileChanges(ORIGINAL, ORIGINAL)).toEqual([]);
  });

  test('Ignores spaces added around the values', () => {
    expect(getProfileChanges({ ...ORIGINAL, firstName: '  Laura ' }, ORIGINAL)).toEqual([]);
  });

  test('Lists each modified field with its previous and new value', () => {
    expect(getProfileChanges({ ...ORIGINAL, firstName: 'Lauren', phoneNumber: '87776655' }, ORIGINAL)).toEqual([
      { field: 'firstName', label: 'Nombre', previous: 'Laura', current: 'Lauren' },
      { field: 'phoneNumber', label: 'Celular', previous: '88881234', current: '87776655' }
    ]);
  });
});

describe('profile helpers', () => {
  test('cleanFormValues trims names and removes spaces from the phone', () => {
    expect(cleanFormValues({ ...ORIGINAL, firstName: ' María   José ', phoneNumber: '8888 1234' })).toMatchObject({
      firstName: 'María José',
      phoneNumber: '88881234'
    });
  });

  test('toFormValues keeps only the editable fields', () => {
    const profile = { ...ORIGINAL, middleName: null, email: 'a@b.c', role: 'CLIENT', locations: null };
    expect(toFormValues(profile)).toEqual({ ...ORIGINAL, middleName: '' });
  });

  test('formatBirthdate uses DD/MM/YYYY', () => {
    expect(formatBirthdate('1998-03-15')).toBe('15/03/1998');
  });

  test('getLocationsLabel joins the locations or shows the empty message', () => {
    expect(getLocationsLabel({ locations: [{ id: 1, name: 'Oxígeno' }, { id: 2, name: 'Escazú' }] })).toBe('Oxígeno, Escazú');
    expect(getLocationsLabel({ locations: [] })).toBe('No tiene sucursales asignadas');
  });
});
