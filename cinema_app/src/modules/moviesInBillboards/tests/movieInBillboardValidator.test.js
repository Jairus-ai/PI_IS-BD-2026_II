import { describe, expect, test } from '@jest/globals';
import {
  cleanMovieInBillboardFilters,
  validateMovieInBillboardId,
  validatePage
} from '../validators/movieInBillboardValidator';

describe('movieInBillboardValidator', () => {
  test('Accepts a valid page', () => {
    expect(() => validatePage(2)).not.toThrow();
  });

  test('Rejects an invalid page', () => {
    expect(() => validatePage(0)).toThrow('La página debe ser un número entero mayor a 0.');
  });

  test('Rejects an invalid ID', () => {
    expect(() => validateMovieInBillboardId('abc')).toThrow('La película en cartelera seleccionada no es válida.');
  });

  test('Cleans the filters', () => {
    const filters = {
      locationId: '3',
      ratingId: '',
      movieName: '  Inception  '
    };

    expect(cleanMovieInBillboardFilters(filters)).toEqual({
      locationId: 3,
      movieName: 'Inception'
    });
  });

  test('Rejects an invalid ID filter', () => {
    expect(() => cleanMovieInBillboardFilters({ ratingId: -1 })).toThrow('El filtro seleccionado no es válido.');
  });

  test('Rejects a movie name longer than 100 characters', () => {
    const filters = { movieName: 'a'.repeat(101) };

    expect(() => cleanMovieInBillboardFilters(filters)).toThrow('El nombre de la película no puede exceder los 100 caracteres.');
  });
});
