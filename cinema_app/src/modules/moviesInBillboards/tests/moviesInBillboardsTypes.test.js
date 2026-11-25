import { expect, test } from '@jest/globals';
import { formatBillboardDate } from '../types/moviesInBillboards';

test('Formats the billboard date', () => {
  expect(formatBillboardDate('2026-11-25')).toBe('25/11/2026');
});
