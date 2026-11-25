import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import screenRoutes from '../routes/screen_routes.js';
import { ROLES, SESSION_COOKIE_NAME, createSessionToken } from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const SESSION_VERSION = 0;
const WORKER_ID = 7;

const MOCK_SCREENS = [
  {
    ID_SCREEN: 3,
    SCREEN_NAME: 'Sala 01',
    SCREEN_TYPE: 'IMAX',
    AMOUNT_ROWS: 10,
    AMOUNT_SEATS_PER_ROWS: 12,
    AMOUNT_SEATS: 120,
    MAINTENANCE_TIME: 15,
    ADDS_TIME: 10,
    ID_LOCATION: 1,
    LOCATION_NAME: 'Oxígeno'
  }
];

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/management/screens', screenRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});

function sessionCookie(role) {
  const token = createSessionToken({ id: WORKER_ID, role, sessionVersion: SESSION_VERSION });
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function mockDatabase(...controllerResponses) {
  const execute = jest.fn().mockResolvedValueOnce({ rows: [[SESSION_VERSION]] });
  for (const response of controllerResponses) {
    if (response instanceof Error) {
      execute.mockRejectedValueOnce(response);
    } else {
      execute.mockResolvedValueOnce(response);
    }
  }
  const connection = { execute, commit: jest.fn().mockResolvedValue(), close: jest.fn().mockResolvedValue() };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function screensQueryCall(connection) {
  return connection.execute.mock.calls[1];
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /management/screens', () => {
  test('Returns the active screens for a superuser', async () => {
    mockDatabase({ rows: MOCK_SCREENS });

    const response = await request(app)
      .get('/management/screens')
      .set('Cookie', sessionCookie(ROLES.SUPERUSER))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_SCREENS);
  });

  test('A superuser sees the screens of every location', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.SUPERUSER)).expect(200);

    const [, binds] = screensQueryCall(connection);
    expect(binds).toEqual({ isSuperuser: 1, workerId: WORKER_ID });
  });

  test('An administrator only sees the screens of the assigned locations', async () => {
    const connection = mockDatabase({ rows: MOCK_SCREENS });

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.ADMINISTRATOR)).expect(200);

    const [sql, binds] = screensQueryCall(connection);
    expect(binds).toEqual({ isSuperuser: 0, workerId: WORKER_ID });
    expect(sql).toMatch(/FROM PI_DEVELOPERS\.WORKER_LOCATIONS wl/);
    expect(sql).toMatch(/wl\.ID_WORKER = :workerId/);
  });

  test('Only takes active screens of active locations', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.SUPERUSER)).expect(200);

    const [sql] = screensQueryCall(connection);
    expect(sql).toContain('sc.IS_DELETED = 0');
    expect(sql).toContain('l.IS_DELETED = 0');
  });

  test('Names each screen with its number inside the location', async () => {
    const connection = mockDatabase({ rows: [] });

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.SUPERUSER)).expect(200);

    const [sql] = screensQueryCall(connection);
    expect(sql).toMatch(/'Sala ' \|\| LPAD\(sc\.SCREEN_NUMBER, 2, '0'\) AS SCREEN_NAME/);
    expect(sql).toContain('ORDER BY l.LOCATION_NAME ASC, sc.SCREEN_NUMBER ASC');
  });

  test('Returns an empty list when there are no screens', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app)
      .get('/management/screens')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Rejects an employee with 403', async () => {
    mockDatabase();

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.EMPLOYEE)).expect(403);
  });

  test('Rejects a client with 403', async () => {
    mockDatabase();

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.CLIENT)).expect(403);
  });

  test('Rejects a request without session with 401', async () => {
    await request(app).get('/management/screens').expect(401);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app).get('/management/screens').set('Cookie', sessionCookie(ROLES.SUPERUSER)).expect(500);

    expect(connection.close).toHaveBeenCalled();
  });
});

const VALID_SCREEN = { locationId: 1, type: 'IMAX', rows: 10, seatsPerRow: 12, maintenanceTime: 15, addsTime: 10 };
const LOCATION_ROWS = { rows: [{ ID_LOCATION: 1 }] };

function postScreen(body, role = ROLES.SUPERUSER) {
  return request(app).post('/management/screens').set('Cookie', sessionCookie(role)).send(body);
}

describe('GET /management/screens/locations', () => {
  test('Returns the locations the user can manage', async () => {
    const locations = [{ ID_LOCATION: 1, LOCATION_NAME: 'Oxígeno' }];
    const connection = mockDatabase({ rows: locations });

    const response = await request(app)
      .get('/management/screens/locations')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    expect(response.body.data).toEqual(locations);
    const [sql, binds] = connection.execute.mock.calls[1];
    expect(binds).toEqual({ isSuperuser: 0, workerId: WORKER_ID });
    expect(sql).toContain('l.IS_DELETED = 0');
    expect(sql).toMatch(/wl\.ID_WORKER = :workerId/);
  });

  test('Rejects an employee with 403', async () => {
    mockDatabase();

    await request(app).get('/management/screens/locations').set('Cookie', sessionCookie(ROLES.EMPLOYEE)).expect(403);
  });
});

describe('POST /management/screens', () => {
  test('Creates the screen with the capacity calculated by the server', async () => {
    const connection = mockDatabase(
      LOCATION_ROWS,
      { outBinds: { screenId: [40] } },
      { rows: [{ ...MOCK_SCREENS[0], ID_SCREEN: 40, SCREEN_NAME: 'Sala 03' }] }
    );

    const response = await postScreen({ ...VALID_SCREEN, capacity: 999 }).expect(201);

    expect(response.body.data).toMatchObject({ ID_SCREEN: 40, SCREEN_NAME: 'Sala 03' });
    const [sql, binds] = connection.execute.mock.calls[2];
    expect(sql).toContain(':rowCount * :seatsPerRow');
    expect(sql).toMatch(/SELECT NVL\(MAX\(SCREEN_NUMBER\), 0\) \+ 1 FROM PI_DEVELOPERS\.SCREENS WHERE ID_LOCATION = :locationId/);
    expect(binds).toMatchObject({ screenType: 'IMAX', rowCount: 10, seatsPerRow: 12, maintenanceTime: 15, addsTime: 10, locationId: 1 });
    expect(binds).not.toHaveProperty('capacity');
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('Returns the new screen with its name inside the location', async () => {
    const connection = mockDatabase(LOCATION_ROWS, { outBinds: { screenId: [40] } }, { rows: [MOCK_SCREENS[0]] });

    await postScreen(VALID_SCREEN).expect(201);

    const [sql, binds] = connection.execute.mock.calls[3];
    expect(sql).toContain('AND sc.ID_SCREEN = :screenId');
    expect(binds).toEqual({ isSuperuser: 1, workerId: WORKER_ID, screenId: 40 });
  });

  test('Tries again with the next number when another screen took it at the same time', async () => {
    const duplicated = Object.assign(new Error('ORA-00001: unique constraint violated'), { errorNum: 1 });
    const connection = mockDatabase(LOCATION_ROWS, duplicated, { outBinds: { screenId: [42] } }, { rows: [MOCK_SCREENS[0]] });

    await postScreen(VALID_SCREEN).expect(201);

    const inserts = connection.execute.mock.calls.filter(([sql]) => sql.includes('INSERT INTO PI_DEVELOPERS.SCREENS'));
    expect(inserts).toHaveLength(2);
    expect(connection.commit).toHaveBeenCalledTimes(1);
  });

  test('An administrator cannot add a screen to a location that is not assigned to them', async () => {
    const connection = mockDatabase({ rows: [] });

    const response = await postScreen(VALID_SCREEN, ROLES.ADMINISTRATOR).expect(400);

    expect(response.body.errors).toEqual({ locationId: 'Seleccione una sucursal válida' });
    const [, binds] = connection.execute.mock.calls[1];
    expect(binds).toEqual({ isSuperuser: 0, workerId: WORKER_ID, locationId: 1 });
    expect(connection.execute).toHaveBeenCalledTimes(2);
  });

  test('Returns every missing field without touching the screens', async () => {
    const connection = mockDatabase();

    const response = await postScreen({}).expect(400);
    expect(connection.execute).toHaveBeenCalledTimes(1);

    expect(response.body.errors).toEqual({
      locationId: 'Campo obligatorio',
      type: 'Campo obligatorio',
      rows: 'Campo obligatorio',
      seatsPerRow: 'Campo obligatorio',
      maintenanceTime: 'Campo obligatorio',
      addsTime: 'Campo obligatorio'
    });
  });

  test.each([
    ['rows', 0, 'La cantidad de filas debe estar entre 1 y 26'],
    ['rows', 27, 'La cantidad de filas debe estar entre 1 y 26'],
    ['rows', 2.5, 'La cantidad de filas debe estar entre 1 y 26'],
    ['seatsPerRow', 31, 'Los asientos por fila deben estar entre 1 y 30'],
    ['seatsPerRow', 'diez', 'Los asientos por fila deben estar entre 1 y 30'],
    ['maintenanceTime', 31, 'El tiempo de mantenimiento debe estar entre 0 y 30 minutos'],
    ['addsTime', -1, 'El tiempo de anuncios debe estar entre 0 y 30 minutos'],
    ['type', 'PREMIUM', 'Seleccione un tipo de sala válido']
  ])('Rejects %s = %p', async (field, value, message) => {
    mockDatabase();

    const response = await postScreen({ ...VALID_SCREEN, [field]: value }).expect(400);

    expect(response.body.errors).toEqual({ [field]: message });
  });

  test('Accepts the limits of every range', async () => {
    mockDatabase(LOCATION_ROWS, { outBinds: { screenId: [41] } }, { rows: [MOCK_SCREENS[0]] });

    await postScreen({ ...VALID_SCREEN, rows: 26, seatsPerRow: 30, maintenanceTime: 0, addsTime: 30 }).expect(201);
  });

  test('Rejects an employee with 403', async () => {
    mockDatabase();

    await postScreen(VALID_SCREEN, ROLES.EMPLOYEE).expect(403);
  });

  test('Returns 500 and closes the connection when the insert fails', async () => {
    const connection = mockDatabase(LOCATION_ROWS, new Error('ORA-02291: integrity constraint violated'));

    await postScreen(VALID_SCREEN).expect(500);

    expect(connection.close).toHaveBeenCalled();
  });
});
