import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import profileRoutes from '../routes/profile_routes.js';
import { validateProfileData } from '../validators/profile_validator.js';
import { ROLES, SESSION_COOKIE_NAME, createSessionToken } from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const SESSION_VERSION = 0;
const CLIENT_ID = 7;
const WORKER_ID = 3;

const CLIENT_ROW = {
  EMAIL: 'prueba.prueba@ejemplo.com',
  IDENTIFICATION_TYPE: 'C',
  IDENTIFICATION_NUMBER: '112345678',
  PHONE_NUMBER: '88881234',
  FIRST_NAME: 'Laura',
  MIDDLE_NAME: null,
  FIRST_SURNAME: 'Vega',
  LAST_SURNAME: 'Mora',
  BIRTHDATE: '1998-03-15',
  ROLE: null
};
const WORKER_ROW = { ...CLIENT_ROW, EMAIL: 'empleado.prueba@ejemplo.com', FIRST_NAME: 'Carlos', ROLE: 'E' };
const LOCATIONS = [{ ID_LOCATION: 2, LOCATION_NAME: 'Escazú' }, { ID_LOCATION: 1, LOCATION_NAME: 'Oxígeno' }];
const VALID_CHANGES = { firstName: 'Lauren', middleName: '', firstSurname: 'Vega', lastSurname: 'Mora', phoneNumber: '87776655' };

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/profile', profileRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});

function sessionCookie(role = ROLES.CLIENT, id = CLIENT_ID) {
  const token = createSessionToken({ id, role, sessionVersion: SESSION_VERSION });
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
  const connection = { execute, close: jest.fn().mockResolvedValue() };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /profile', () => {
  test('Rejects a request without a session with 401', async () => {
    await request(app).get('/profile').expect(401);
  });

  test('Returns the personal information of the client in session without locations', async () => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] });

    const response = await request(app).get('/profile').set('Cookie', sessionCookie()).expect(200);

    expect(response.body.data).toEqual({
      email: 'prueba.prueba@ejemplo.com',
      identificationType: 'C',
      identificationNumber: '112345678',
      phoneNumber: '88881234',
      firstName: 'Laura',
      middleName: '',
      firstSurname: 'Vega',
      lastSurname: 'Mora',
      birthdate: '1998-03-15',
      role: ROLES.CLIENT,
      locations: null
    });
    const [sql, binds] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/FROM PI_DEVELOPERS\.CLIENTS/);
    expect(binds).toEqual({ id: CLIENT_ID });
    expect(connection.execute).toHaveBeenCalledTimes(2);
  });

  test('Never selects or returns credentials', async () => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] });

    const response = await request(app).get('/profile').set('Cookie', sessionCookie()).expect(200);

    const [sql] = connection.execute.mock.calls[1];
    expect(sql).not.toMatch(/CREDENTIALS|HASH|PASSWORD/);
    expect(JSON.stringify(response.body)).not.toMatch(/hash|password|credential/i);
  });

  test.each([
    [ROLES.EMPLOYEE, 'E'],
    [ROLES.ADMINISTRATOR, 'A'],
    [ROLES.SUPERUSER, 'S']
  ])('Returns the assigned locations of the %s', async (role, code) => {
    const connection = mockDatabase({ rows: [{ ...WORKER_ROW, ROLE: code }] }, { rows: LOCATIONS });

    const response = await request(app).get('/profile').set('Cookie', sessionCookie(role, WORKER_ID)).expect(200);

    expect(response.body.data.role).toBe(role);
    expect(response.body.data.locations).toEqual([{ id: 2, name: 'Escazú' }, { id: 1, name: 'Oxígeno' }]);
    const [sql, binds] = connection.execute.mock.calls[1];
    expect(sql).toMatch(/FROM PI_DEVELOPERS\.WORKERS/);
    expect(sql).toMatch(/IS_ACTIVE = 1/);
    expect(binds).toEqual({ id: WORKER_ID });
  });

  test('Returns an empty list when the worker has no locations', async () => {
    mockDatabase({ rows: [WORKER_ROW] }, { rows: [] });

    const response = await request(app).get('/profile').set('Cookie', sessionCookie(ROLES.EMPLOYEE, WORKER_ID)).expect(200);

    expect(response.body.data.locations).toEqual([]);
  });

  test('Answers 404 when the user no longer exists', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app).get('/profile').set('Cookie', sessionCookie()).expect(404);

    expect(response.body.message).toBe('No se encontró la información personal');
  });

  test('Passes database errors to the error handler', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    const response = await request(app).get('/profile').set('Cookie', sessionCookie()).expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(connection.close).toHaveBeenCalled();
  });
});

describe('PUT /profile', () => {
  function putProfile(body, cookie = sessionCookie()) {
    return request(app).put('/profile').set('Cookie', cookie).send(body);
  }

  test('Rejects a request without a session with 401', async () => {
    await request(app).put('/profile').send(VALID_CHANGES).expect(401);
  });

  test('Updates only the editable fields of the client in session', async () => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] }, { rowsAffected: 1 });

    const response = await putProfile({
      ...VALID_CHANGES,
      email: 'otro@ejemplo.com',
      identificationNumber: '999999999',
      role: ROLES.SUPERUSER
    }).expect(200);

    const [sql, binds, options] = connection.execute.mock.calls[2];
    expect(sql).toMatch(/UPDATE PI_DEVELOPERS\.CLIENTS/);
    expect(sql).not.toMatch(/EMAIL|IDENTIFICATION|BIRTHDATE|ROLE/);
    expect(binds).toEqual({
      firstName: 'Lauren',
      middleName: null,
      firstSurname: 'Vega',
      lastSurname: 'Mora',
      phoneNumber: '87776655',
      id: CLIENT_ID
    });
    expect(options).toEqual({ autoCommit: true });
    expect(response.body.data).toMatchObject({ firstName: 'Lauren', phoneNumber: '87776655', email: 'prueba.prueba@ejemplo.com', role: ROLES.CLIENT });
  });

  test('Updates the worker in session', async () => {
    const connection = mockDatabase({ rows: [WORKER_ROW] }, { rows: LOCATIONS }, { rowsAffected: 1 });

    const response = await putProfile(VALID_CHANGES, sessionCookie(ROLES.EMPLOYEE, WORKER_ID)).expect(200);

    const [sql, binds] = connection.execute.mock.calls[3];
    expect(sql).toMatch(/UPDATE PI_DEVELOPERS\.WORKERS/);
    expect(sql).toMatch(/IS_ACTIVE = 1/);
    expect(binds.id).toBe(WORKER_ID);
    expect(response.body.data.locations).toHaveLength(2);
  });

  test('Trims the names and joins repeated spaces', async () => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] }, { rowsAffected: 1 });

    await putProfile({ ...VALID_CHANGES, firstName: '  María   José ', lastSurname: ' Núñez ' }).expect(200);

    const [, binds] = connection.execute.mock.calls[2];
    expect(binds.firstName).toBe('María José');
    expect(binds.lastSurname).toBe('Núñez');
  });

  test.each([
    ['empty first name', { firstName: '' }, 'firstName', 'Campo obligatorio'],
    ['empty first surname', { firstSurname: '   ' }, 'firstSurname', 'Campo obligatorio'],
    ['empty phone', { phoneNumber: '' }, 'phoneNumber', 'Campo obligatorio'],
    ['numbers in the name', { firstName: 'Laura2' }, 'firstName', 'Solo se permiten letras y espacios'],
    ['symbols in the surname', { lastSurname: 'Mora-' }, 'lastSurname', 'Solo se permiten letras y espacios'],
    ['a phone with 7 digits', { phoneNumber: '8888123' }, 'phoneNumber', 'El celular debe tener 8 dígitos'],
    ['a phone with 9 digits', { phoneNumber: '888812345' }, 'phoneNumber', 'El celular debe tener 8 dígitos'],
    ['letters in the phone', { phoneNumber: '8888abcd' }, 'phoneNumber', 'El celular debe tener 8 dígitos']
  ])('Answers 400 for %s and does not update', async (_case, change, field, message) => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] });

    const response = await putProfile({ ...VALID_CHANGES, ...change }).expect(400);

    expect(response.body.errors[field]).toBe(message);
    expect(connection.execute).toHaveBeenCalledTimes(2);
  });

  test('Answers 404 when the user no longer exists', async () => {
    mockDatabase({ rows: [] });

    await putProfile(VALID_CHANGES).expect(404);
  });

  test('Passes update errors to the error handler', async () => {
    const connection = mockDatabase({ rows: [CLIENT_ROW] }, new Error('ORA-12899: value too large'));

    await putProfile(VALID_CHANGES).expect(500);

    expect(connection.close).toHaveBeenCalled();
  });
});

describe('Profile validation rules', () => {
  const valid = { firstName: 'Laura', middleName: '', firstSurname: 'Vega', lastSurname: '', phoneNumber: '88881234' };

  test('Accepts accents, ñ and spaces in the names', () => {
    expect(validateProfileData({ ...valid, firstName: 'María José', firstSurname: 'Núñez' })).toEqual({});
  });

  test('Accepts exactly 8 digits in the phone', () => {
    expect(validateProfileData({ ...valid, phoneNumber: '87776655' })).toEqual({});
  });

  test('Keeps an unchanged phone registered with another format', () => {
    expect(validateProfileData({ ...valid, phoneNumber: '+50688881234' }, '+50688881234')).toEqual({});
  });

  test('Rejects a name of 51 characters', () => {
    expect(validateProfileData({ ...valid, firstName: 'a'.repeat(51) }).firstName).toBe('No puede exceder 50 caracteres');
  });
});
