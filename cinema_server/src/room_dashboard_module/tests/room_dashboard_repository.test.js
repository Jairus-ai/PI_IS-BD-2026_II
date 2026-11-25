import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const OUT_FORMAT_OBJECT = 4002;

jest.unstable_mockModule('oracledb', () => ({ default: { OUT_FORMAT_OBJECT } }));
jest.unstable_mockModule('../../session/session.js', () => ({
  ROLES: { SUPERUSER: 'S', ADMINISTRATOR: 'A', EMPLOYEE: 'E' }
}));

const {
  deleteStatusOverride,
  findAccessibleRoom,
  findAccessibleRooms,
  findActiveStatusOverride,
  findRoomScreenings,
  getDatabaseClock,
  saveStatusOverride
} = await import('../repositories/room_dashboard_repository.js');

const OBJECT_FORMAT = { outFormat: OUT_FORMAT_OBJECT };

let connection;

beforeEach(() => {
  connection = { execute: jest.fn() };
});

describe('findAccessibleRooms', () => {
  test('a superuser sees every room (isSuperuser = 1)', async () => {
    const rows = [{ ID_SCREEN: 1 }];
    connection.execute.mockResolvedValue({ rows });

    const result = await findAccessibleRooms(connection, { id: 3, role: 'S' });

    expect(result).toBe(rows);
    const [sql, binds, options] = connection.execute.mock.calls[0];
    expect(binds).toEqual({ isSuperuser: 1, workerId: 3 });
    expect(options).toEqual(OBJECT_FORMAT);
    expect(sql).not.toContain('r.ID_SCREEN = :roomId');
  });

  test.each(['A', 'E'])('role %s is limited by its branches (isSuperuser = 0)', async (role) => {
    connection.execute.mockResolvedValue({ rows: [] });

    await findAccessibleRooms(connection, { id: 8, role });

    expect(connection.execute.mock.calls[0][1]).toEqual({ isSuperuser: 0, workerId: 8 });
  });
});

describe('findAccessibleRoom', () => {
  test('filters by room and returns the first row', async () => {
    connection.execute.mockResolvedValue({ rows: [{ ID_SCREEN: 5 }, { ID_SCREEN: 6 }] });

    const room = await findAccessibleRoom(connection, { id: 8, role: 'E' }, 5);

    expect(room).toEqual({ ID_SCREEN: 5 });
    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('AND r.ID_SCREEN = :roomId');
    expect(binds).toEqual({ isSuperuser: 0, workerId: 8, roomId: 5 });
  });

  test('returns null when the room is not accessible', async () => {
    connection.execute.mockResolvedValue({ rows: [] });

    expect(await findAccessibleRoom(connection, { id: 8, role: 'E' }, 99)).toBeNull();
  });
});

describe('getDatabaseClock', () => {
  test('maps the clock row to today and nowSeconds', async () => {
    connection.execute.mockResolvedValue({ rows: [{ TODAY: '2026-11-24', NOW_SECONDS: 72180 }] });

    expect(await getDatabaseClock(connection)).toEqual({ today: '2026-11-24', nowSeconds: 72180 });
    expect(connection.execute.mock.calls[0][2]).toEqual(OBJECT_FORMAT);
  });
});

describe('findRoomScreenings', () => {
  test('queries by room and date and returns the rows', async () => {
    const rows = [{ ID_SCREENING: 1 }];
    connection.execute.mockResolvedValue({ rows });

    const result = await findRoomScreenings(connection, 5, '2026-11-24');

    expect(result).toBe(rows);
    expect(connection.execute.mock.calls[0][1]).toEqual({ roomId: 5, screeningDate: '2026-11-24' });
  });
});

describe('findActiveStatusOverride', () => {
  test('returns the active override', async () => {
    const override = { OVERRIDE_STATUS: 'CLEANING', EXPIRES_AT: '20:33' };
    connection.execute.mockResolvedValue({ rows: [override] });

    expect(await findActiveStatusOverride(connection, 5)).toBe(override);
    expect(connection.execute.mock.calls[0][1]).toEqual({ roomId: 5 });
  });

  test('returns null when there is none', async () => {
    connection.execute.mockResolvedValue({ rows: [] });

    expect(await findActiveStatusOverride(connection, 5)).toBeNull();
  });
});

describe('saveStatusOverride', () => {
  test('runs the MERGE with the room, status, worker and minutes', async () => {
    connection.execute.mockResolvedValue({});

    await saveStatusOverride(connection, { roomId: 5, status: 'CLEANING', workerId: 8, minutes: 30 });

    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('MERGE INTO');
    expect(binds).toEqual({ roomId: 5, status: 'CLEANING', workerId: 8, minutes: 30 });
  });
});

describe('deleteStatusOverride', () => {
  test('deletes the override of the room', async () => {
    connection.execute.mockResolvedValue({});

    await deleteStatusOverride(connection, 5);

    const [sql, binds] = connection.execute.mock.calls[0];
    expect(sql).toContain('DELETE FROM');
    expect(binds).toEqual({ roomId: 5 });
  });
});