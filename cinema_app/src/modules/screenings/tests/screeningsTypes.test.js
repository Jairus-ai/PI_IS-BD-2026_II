import { expect, test } from '@jest/globals';
import { formatScreeningDate } from '../types/screenings';

test('Formats the screening date', () => {
  expect(formatScreeningDate('2026-11-25')).toBe('25/11/2026');
});
