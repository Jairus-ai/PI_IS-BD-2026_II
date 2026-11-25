import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const connection = { commit: jest.fn() };

const database = {
  getConnection: jest.fn(),
  closeDatabaseConnection: jest.fn()
};
const repository = {
  deleteStatusOverride: jest.fn(),
  findAccessibleRoom: jest.fn(),
  findAccessibleRooms: jest.fn(),
  findActiveStatusOverride: jest.fn(),
  findRoomScreenings: jest.fn(),
  getDatabaseClock: jest.fn(),
  saveStatusOverride: jest.fn()
};
const dashboardService = {
  buildFilters: jest.fn(),
  buildRoomDashboard: jest.fn()
};

jest.unstable_mockModule('../../database/database.js', () => database);
jest.unstable_mockModule('../repositories/room_dashboard_repository.js', () => repository);
jest.unstable_mockModule('../services/room_dashboard_service.js', () => dashboardService);

const { clearRoomStatus, getRoomDashboard, getRoomDashboardFilters, setRoomStatus } = await import(
  '../controllers/room_dashboard_controller.js'
);
const { MANUAL_STATUS_MINUTES } = await import('../services/room_status_service.js');

const USER = { id: 9, role: 'E' };
const ROOM = { ID_SCREEN: 5 };
const CLOCK = { today: '2026-11-24', nowSeconds: 72000 };

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const buildReq = (overrides = {}) => ({ user: USER, params: { roomId: '5' }, query: {}, body: {}, ...overrides });

let res;
let next;

beforeEach(() => {
  jest.resetAllMocks();
  database.getConnection.mockResolvedValue(connection);
  res = buildRes();
  next = jest.fn();
});

describe('getRoomDashboardFilters', () => {
  test('responds with the filters built from the accessible rooms', async () => {
    const rooms = [ROOM];
    repository.findAccessibleRooms.mockResolvedValue(rooms);
    dashboardService.buildFilters.mockReturnValue({ locations: [], rooms: [] });

    await getRoomDashboardFilters(buildReq(), res, next);

    expect(repository.findAccessibleRooms).toHaveBeenCalledWith(connection, USER);
    expect(dashboardService.buildFilters).toHaveBeenCalledWith(rooms);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { locations: [], rooms: [] } });
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('forwards errors to next and still closes the connection', async () => {
    const error = new Error('db down');
    repository.findAccessibleRooms.mockRejectedValue(error);

    await getRoomDashboardFilters(buildReq(), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });
});

describe('getRoomDashboard', () => {
  test('invalid room id gives 404 without touching the database', async () => {
    await getRoomDashboard(buildReq({ params: { roomId: 'abc' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(database.getConnection).not.toHaveBeenCalled();
  });

  test('invalid date gives 400 with the validation errors', async () => {
    await getRoomDashboard(buildReq({ query: { date: 'hoy' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: { date: expect.any(String) } });
    expect(database.getConnection).not.toHaveBeenCalled();
  });

  test('a room the user cannot access gives 404 and closes the connection', async () => {
    repository.findAccessibleRoom.mockResolvedValue(null);

    await getRoomDashboard(buildReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(repository.getDatabaseClock).not.toHaveBeenCalled();
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('without a date it uses the database date (today)', async () => {
    repository.findAccessibleRoom.mockResolvedValue(ROOM);
    repository.getDatabaseClock.mockResolvedValue(CLOCK);
    repository.findRoomScreenings.mockResolvedValue([]);
    repository.findActiveStatusOverride.mockResolvedValue(null);
    dashboardService.buildRoomDashboard.mockReturnValue({ ok: true });

    await getRoomDashboard(buildReq(), res, next);

    expect(repository.findAccessibleRoom).toHaveBeenCalledWith(connection, USER, 5);
    expect(repository.findRoomScreenings).toHaveBeenCalledWith(connection, 5, CLOCK.today);
    expect(dashboardService.buildRoomDashboard).toHaveBeenCalledWith({
      room: ROOM,
      clock: CLOCK,
      date: CLOCK.today,
      screeningRows: [],
      override: null
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ data: { ok: true } });
  });

  test('with a date it queries that date instead of today', async () => {
    repository.findAccessibleRoom.mockResolvedValue(ROOM);
    repository.getDatabaseClock.mockResolvedValue(CLOCK);
    repository.findRoomScreenings.mockResolvedValue([]);
    repository.findActiveStatusOverride.mockResolvedValue(null);

    await getRoomDashboard(buildReq({ query: { date: '2026-11-25' } }), res, next);

    expect(repository.findRoomScreenings).toHaveBeenCalledWith(connection, 5, '2026-11-25');
  });

  test('forwards unexpected errors to next', async () => {
    const error = new Error('boom');
    repository.findAccessibleRoom.mockRejectedValue(error);

    await getRoomDashboard(buildReq(), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });
});

describe('setRoomStatus', () => {
  const body = { status: 'cleaning' };

  test('invalid room id gives 404', async () => {
    await setRoomStatus(buildReq({ params: { roomId: '0' }, body }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(database.getConnection).not.toHaveBeenCalled();
  });

  test('invalid status gives 400', async () => {
    await setRoomStatus(buildReq({ body: { status: 'BROKEN' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: { status: expect.any(String) } });
    expect(repository.saveStatusOverride).not.toHaveBeenCalled();
  });

  test('a room the user cannot access gives 404 and saves nothing', async () => {
    repository.findAccessibleRoom.mockResolvedValue(null);

    await setRoomStatus(buildReq({ body }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(repository.saveStatusOverride).not.toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('saves the normalized status with the worker and commits', async () => {
    repository.findAccessibleRoom.mockResolvedValue(ROOM);

    await setRoomStatus(buildReq({ body }), res, next);

    expect(repository.saveStatusOverride).toHaveBeenCalledWith(connection, {
      roomId: 5,
      status: 'CLEANING',
      workerId: USER.id,
      minutes: MANUAL_STATUS_MINUTES
    });
    expect(connection.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Estado de la sala actualizado',
      data: { status: 'CLEANING' }
    });
  });

  test('a unique constraint violation (concurrent update) gives 409', async () => {
    repository.findAccessibleRoom.mockResolvedValue(ROOM);
    repository.saveStatusOverride.mockRejectedValue({ errorNum: 1 });

    await setRoomStatus(buildReq({ body }), res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(next).not.toHaveBeenCalled();
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });

  test('forwards any other error to next', async () => {
    const error = Object.assign(new Error('other'), { errorNum: 942 });
    repository.findAccessibleRoom.mockResolvedValue(ROOM);
    repository.saveStatusOverride.mockRejectedValue(error);

    await setRoomStatus(buildReq({ body }), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalledWith(409);
  });
});

describe('clearRoomStatus', () => {
  test('invalid room id gives 404', async () => {
    await clearRoomStatus(buildReq({ params: { roomId: 'x' } }), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(database.getConnection).not.toHaveBeenCalled();
  });

  test('a room the user cannot access gives 404 and deletes nothing', async () => {
    repository.findAccessibleRoom.mockResolvedValue(null);

    await clearRoomStatus(buildReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(repository.deleteStatusOverride).not.toHaveBeenCalled();
  });

  test('deletes the manual status and commits', async () => {
    repository.findAccessibleRoom.mockResolvedValue(ROOM);

    await clearRoomStatus(buildReq(), res, next);

    expect(repository.deleteStatusOverride).toHaveBeenCalledWith(connection, 5);
    expect(connection.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'La sala volvió al estado automático' });
  });

  test('forwards errors to next', async () => {
    const error = new Error('boom');
    repository.findAccessibleRoom.mockRejectedValue(error);

    await clearRoomStatus(buildReq(), res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(database.closeDatabaseConnection).toHaveBeenCalledWith(connection);
  });
});