import { describe, expect, test } from '@jest/globals';
import {
  EMPTY_SCREEN_FILTERS,
  SCREEN_TYPE_OPTIONS,
  getLocationOptions,
  getScreenNameOptions,
  matchesScreenFilters
} from '../utils/screenFilters';

const SCREENS = [
  { ID_SCREEN: 1, SCREEN_NAME: 'Sala 01', SCREEN_TYPE: 'IMAX', ID_LOCATION: 2, LOCATION_NAME: 'Oxígeno' },
  { ID_SCREEN: 2, SCREEN_NAME: 'Sala 02', SCREEN_TYPE: 'REG', ID_LOCATION: 2, LOCATION_NAME: 'Oxígeno' },
  { ID_SCREEN: 3, SCREEN_NAME: 'Sala 01', SCREEN_TYPE: 'VIP', ID_LOCATION: 1, LOCATION_NAME: 'Escazú' }
];

describe('screenFilters', () => {
  test('Without filters every screen matches', () => {
    expect(SCREENS.filter((screen) => matchesScreenFilters(screen, EMPTY_SCREEN_FILTERS))).toHaveLength(3);
  });

  test('Filters by name, location and type together', () => {
    const byName = { ...EMPTY_SCREEN_FILTERS, name: 'Sala 01' };
    const byNameAndLocation = { ...byName, locationId: 1 };
    const byType = { ...EMPTY_SCREEN_FILTERS, type: 'REG' };

    expect(SCREENS.filter((screen) => matchesScreenFilters(screen, byName)).map((screen) => screen.ID_SCREEN)).toEqual([1, 3]);
    expect(SCREENS.filter((screen) => matchesScreenFilters(screen, byNameAndLocation)).map((screen) => screen.ID_SCREEN)).toEqual([3]);
    expect(SCREENS.filter((screen) => matchesScreenFilters(screen, byType)).map((screen) => screen.ID_SCREEN)).toEqual([2]);
  });

  test('Offers each screen name once, sorted', () => {
    expect(getScreenNameOptions(SCREENS)).toEqual([
      { value: 'Sala 01', label: 'Sala 01' },
      { value: 'Sala 02', label: 'Sala 02' }
    ]);
  });

  test('Offers the locations of the screens once, sorted by name', () => {
    expect(getLocationOptions(SCREENS)).toEqual([
      { value: 1, label: 'Escazú' },
      { value: 2, label: 'Oxígeno' }
    ]);
  });

  test('Offers the four screen types with their labels', () => {
    expect(SCREEN_TYPE_OPTIONS).toEqual([
      { value: 'REG', label: 'Regular' },
      { value: 'VIP', label: 'VIP' },
      { value: 'IMAX', label: 'IMAX' },
      { value: '4DX', label: '4DX' }
    ]);
  });
});
