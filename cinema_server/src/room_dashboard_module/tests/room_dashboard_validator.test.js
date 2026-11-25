import { describe, expect, test } from '@jest/globals';
import {
  MANUAL_STATUSES,
  parseRoomId,
  validateDashboardQuery,
  validateManualStatus
} from '../validators/room_dashboard_validator.js';
import { ROOM_STATUS } from '../services/room_status_service.js';

describe('parseRoomId', () => {
  test('accepts positive integers', () => {
    expect(parseRoomId('5')).toBe(5);
  });

  test.each(['abc', '0', '-3', '1.5', '', undefined])('rejects %p', (value) => {
    expect(parseRoomId(value)).toBeNull();
  });
});

describe('validateDashboardQuery', () => {
  test.each([{}, { date: '' }])('no date means today: %p', (query) => {
    expect(validateDashboardQuery(query)).toEqual({ errors: {}, date: null });
  });

  test('accepts a valid date and trims it', () => {
    expect(validateDashboardQuery({ date: ' 2026-11-24 ' })).toEqual({ errors: {}, date: '2026-11-24' });
  });

  test('accepts a leap day only on leap years', () => {
    expect(validateDashboardQuery({ date: '2028-02-29' }).errors).toEqual({});
    expect(validateDashboardQuery({ date: '2027-02-29' }).errors.date).toBeDefined();
  });

  test.each(['2026-02-31', '2026-13-01', '24/11/2026', 'hoy', ['2026-11-24', '2026-11-25']])(
    'rejects %p',
    (date) => {
      const { errors, date: parsed } = validateDashboardQuery({ date });
      expect(errors.date).toBeDefined();
      expect(parsed).toBeNull();
    }
  );
});

describe('validateManualStatus', () => {
  test('normalizes case and spaces', () => {
    expect(validateManualStatus({ status: ' cleaning ' })).toEqual({ errors: {}, status: 'CLEANING' });
  });

  test.each([{ status: 'BROKEN' }, { status: '' }, { status: 5 }, {}, undefined])('rejects %p', (body) => {
    expect(validateManualStatus(body).errors.status).toBeDefined();
  });

  test('allowed statuses match the room statuses of the service', () => {
    expect([...MANUAL_STATUSES].sort()).toEqual(Object.values(ROOM_STATUS).sort());
  });
});