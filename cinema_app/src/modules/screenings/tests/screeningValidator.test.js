import { describe, expect, test } from '@jest/globals';
import {
  cleanScreeningFilters,
  validatePage,
  validateScreeningId
} from '../validators/screeningValidator';

describe('screeningValidator', () => {
  test('Rejects an invalid page and ID', () => {
    expect(() => validatePage(0)).toThrow();
    expect(() => validateScreeningId('abc')).toThrow();
  });

  test('Cleans the filters', () => {
    const filters = {
      locationId: '1',
      audiovisualFormatId: '',
      ratingId: 3,
      movieName: '  Inception  '
    };

    expect(cleanScreeningFilters(filters)).toEqual({
      locationId: 1,
      ratingId: 3,
      movieName: 'Inception'
    });
  });

  test('Rejects invalid filters', () => {
    expect(() => cleanScreeningFilters({ ratingId: -1 })).toThrow();
    expect(() => cleanScreeningFilters({ movieName: 'a'.repeat(101) })).toThrow();
  });
});
