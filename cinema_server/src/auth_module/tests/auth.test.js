import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import oracledb from 'oracledb';

import authRoutes from '../routes/auth_routes.js';
import { ROLES, createSessionToken, SESSION_COOKIE_NAME } from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);

const PASSWORD = 'Pi!Prueba#test42';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);

function accountRow(overrides = {}) {
  return {
    ID: 7,
    ROLE_CODE: 'CLIENT',
    EMAIL: 'adrian.prueba@ucr.ac.cr',
    FIRST_NAME: 'Adrián',
    FIRST_SURNAME: 'Arias',
    HASH: PASSWORD_HASH,
    SESSION_VERSION: 0,
    ...overrides
  };
}

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /auth/login', () => {
  test('Log in client 200 OK and starts a session', async () => {
    const connection = mockDatabaseConnection(async () => ({ rows: [accountRow()] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'Adrian.Prueba@ucr.ac.cr', password: PASSWORD })
      .expect(200);

    expect(response.body.data).toEqual({
      id: 7,
      role: ROLES.CLIENT,
      email: 'adrian.prueba@ucr.ac.cr',
      firstName: 'Adrián',
      firstSurname: 'Arias'
    });
    expect(connection.execute.mock.calls[0][1]).toEqual({ email: 'adrian.prueba@ucr.ac.cr' });
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=.*HttpOnly/);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('Log in worker 200 OK with its role', async () => {
    mockDatabaseConnection(async () => ({
      rows: [accountRow({ ID: 3, ROLE_CODE: 'A', EMAIL: 'admin.prueba@cinepi.com' })]
    }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'admin.prueba@cinepi.com', password: PASSWORD })
      .expect(200);

    expect(response.body.data.role).toBe(ROLES.ADMINISTRATOR);
  });

  test('Log in 400 when fields are empty', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await request(app)
      .post('/auth/login')
      .send({})
      .expect(400);

    expect(response.body.errors).toEqual({
      email: 'Campo obligatorio',
      password: 'Campo obligatorio'
    });
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('Log in 400 when email format is invalid', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'adrian@correo', password: PASSWORD })
      .expect(400);

    expect(response.body.errors.email).toBe('El correo electrónico no tiene un formato válido');
  });

  test('Log in 401 when the password is wrong', async () => {
    mockDatabaseConnection(async () => ({ rows: [accountRow()] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'adrian.prueba@ucr.ac.cr', password: 'OtraClave#2026' })
      .expect(401);

    expect(response.body.errors.password).toBe('Correo o contraseña incorrectos');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  test('Log in 401 with the same message when the email does not exist', async () => {
    mockDatabaseConnection(async () => ({ rows: [] }));

    const response = await request(app)
      .post('/auth/login')
      .send({ email: 'nadie@correo.com', password: PASSWORD })
      .expect(401);

    expect(response.body.errors.password).toBe('Correo o contraseña incorrectos');
  });
});

describe('POST /auth/logout', () => {
  test('Log out invalidates the session in the server and clears the cookie', async () => {
    const connection = mockDatabaseConnection(async () => ({ rowsAffected: 1 }));
    const token = createSessionToken({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });

    const response = await request(app)
      .post('/auth/logout')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.message).toBe('Sesión cerrada correctamente');
    expect(connection.execute.mock.calls[0][0]).toMatch(/SESSION_VERSION = SESSION_VERSION \+ 1/);
    expect(connection.execute.mock.calls[0][0]).toMatch(/ID_CLIENT = :id/);
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=;/);
  });

  test('Log out without a session does not fail', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    await request(app)
      .post('/auth/logout')
      .expect(200);

    expect(getConnectionSpy).not.toHaveBeenCalled();
  });
});

describe('GET /auth/me', () => {
  test('Returns the user of an active session', async () => {
    mockDatabaseConnection(async (sql) => (
      sql.includes('SESSION_VERSION')
        ? { rows: [[0]] }
        : { rows: [{ ID: 3, EMAIL: 'admin.prueba@cinepi.com', FIRST_NAME: 'Admin', FIRST_SURNAME: 'Prueba' }] }
    ));
    const token = createSessionToken({ id: 3, role: ROLES.ADMINISTRATOR, sessionVersion: 0 });

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.data).toEqual({
      id: 3,
      role: ROLES.ADMINISTRATOR,
      email: 'admin.prueba@cinepi.com',
      firstName: 'Admin',
      firstSurname: 'Prueba'
    });
  });

  test('Returns 401 after the session was closed', async () => {
    mockDatabaseConnection(async () => ({ rows: [[1]] }));
    const oldToken = createSessionToken({ id: 3, role: ROLES.ADMINISTRATOR, sessionVersion: 0 });

    const response = await request(app)
      .get('/auth/me')
      .set('Cookie', sessionCookie(oldToken))
      .expect(401);

    expect(response.body.message).toBe('La sesión expiró. Inicia sesión de nuevo');
  });
});
