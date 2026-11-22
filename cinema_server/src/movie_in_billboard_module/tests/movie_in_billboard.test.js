import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import movieInBillboardRoutes from '../routes/movie_in_billboard_routes.js';
import {
  ROLES,
  SESSION_COOKIE_NAME,
  createSessionToken
} from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const SESSION_VERSION = 0;
const BASE_PATH = '/management/movies_in_billboards';

const MOCK_MOVIES_IN_BILLBOARDS = [
  {
    ID_MOVIE_IN_BILLBOARD: 1,
    MOVIE_TITLE: 'Inception',
    LOCATION_NAME: 'Sede Central',
    OPENING_DATE: '2026-11-01',
    CLOSING_DATE: '2026-11-30',
    RATING_NAME: 'Mayores de 13 años'
  },
  {
    ID_MOVIE_IN_BILLBOARD: 2,
    MOVIE_TITLE: 'El último faro',
    LOCATION_NAME: 'Sede Norte',
    OPENING_DATE: '2026-10-15',
    CLOSING_DATE: '2026-11-15',
    RATING_NAME: 'Todo público'
  }
];

const MOCK_MOVIE_IN_BILLBOARD_DETAIL = {
  ...MOCK_MOVIES_IN_BILLBOARDS[0],
  RATING_CODE: 'PG-13',
  MOVIE_DURATION: 148,
  POSTER: '/posters/inception.jpg'
};

const app = express();
app.use(cookieParser());
app.use(BASE_PATH, movieInBillboardRoutes);
app.use((error, req, res, next) => {
  res.status(error.status ?? 500).json({ message: error.message });
});

function sessionCookie(role) {
  const token = createSessionToken({
    id: 1,
    role,
    sessionVersion: SESSION_VERSION
  });

  return `${SESSION_COOKIE_NAME}=${token}`;
}

function mockDatabase(...controllerResponses) {
  const execute = jest.fn().mockResolvedValueOnce({ rows: [[SESSION_VERSION]] });

  for (const response of controllerResponses) {
    if (response instanceof Error)
      execute.mockRejectedValueOnce(response);
    else
      execute.mockResolvedValueOnce(response);
  }

  const connection = {
    execute,
    close: jest.fn().mockResolvedValue()
  };

  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);

  return connection;
}

function controllerCall(connection) {
  return connection.execute.mock.calls[1];
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Session for /management/movies_in_billboards', () => {
  test('Returns 401 without a session', async () => {
    await request(app).get(BASE_PATH).expect(401);
  });

  test('Returns 403 for a client', async () => {
    mockDatabase();

    await request(app)
      .get(BASE_PATH)
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(403);
  });

  test('Returns 403 for an employee', async () => {
    mockDatabase();

    await request(app)
      .get(BASE_PATH)
      .set('Cookie', sessionCookie(ROLES.EMPLOYEE))
      .expect(403);
  });
});

describe('GET /management/movies_in_billboards/count', () => {
  test('Returns the total of movies in billboards for an administrator', async () => {
    const connection = mockDatabase({ rows: [{ TOTAL: 12 }] });

    const response = await request(app)
      .get(`${BASE_PATH}/count`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ total: 12 });

    const [sql, binds] = controllerCall(connection);

    expect(sql).toMatch(/mib\.IS_DELETED = 0/);
    expect(binds).toEqual({});
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Applies the location and rating filters', async () => {
    const connection = mockDatabase({ rows: [{ TOTAL: 1 }] });

    await request(app)
      .get(`${BASE_PATH}/count?locationId=3&ratingId=2`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    const [sql, binds] = controllerCall(connection);

    expect(sql).toMatch(/mib\.ID_LOCATION = :locationId/);
    expect(sql).toMatch(/m\.ID_RATING = :ratingId/);
    expect(binds).toEqual({
      locationId: 3,
      ratingId: 2
    });
  });

  test('Ignores empty filters', async () => {
    const connection = mockDatabase({ rows: [{ TOTAL: 12 }] });

    await request(app)
      .get(`${BASE_PATH}/count?locationId=&ratingId=`)
      .set('Cookie', sessionCookie(ROLES.SUPERUSER))
      .expect(200);

    const [, binds] = controllerCall(connection);

    expect(binds).toEqual({});
  });

  test('Returns 400 when a filter is not a valid ID', async () => {
    mockDatabase();

    await request(app)
      .get(`${BASE_PATH}/count?locationId=abc`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(400);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app)
      .get(`${BASE_PATH}/count`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(500);

    expect(connection.close).toHaveBeenCalledTimes(2);
  });
});

describe('GET /management/movies_in_billboards', () => {
  test('Returns the first page when no page is given', async () => {
    const connection = mockDatabase({ rows: MOCK_MOVIES_IN_BILLBOARDS });

    const response = await request(app)
      .get(BASE_PATH)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({
      page: 1,
      limit: 10,
      data: MOCK_MOVIES_IN_BILLBOARDS
    });

    const [sql, binds] = controllerCall(connection);

    expect(sql).toMatch(/OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY/);
    expect(binds).toEqual({
      offset: 0,
      limit: 10
    });
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Calculates the offset of the requested page with filters', async () => {
    const connection = mockDatabase({ rows: [] });

    const response = await request(app)
      .get(`${BASE_PATH}?page=3&locationId=1&ratingId=4`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    expect(response.body).toEqual({
      page: 3,
      limit: 10,
      data: []
    });

    const [, binds] = controllerCall(connection);

    expect(binds).toEqual({
      locationId: 1,
      ratingId: 4,
      offset: 20,
      limit: 10
    });
  });

  test('Returns 400 when the page is lower than 1', async () => {
    mockDatabase();

    await request(app)
      .get(`${BASE_PATH}?page=0`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(400);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app)
      .get(BASE_PATH)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(500);

    expect(connection.close).toHaveBeenCalledTimes(2);
  });
});

describe('GET /management/movies_in_billboards/:id', () => {
  test('Returns the details of the movie in billboard', async () => {
    const connection = mockDatabase({ rows: [MOCK_MOVIE_IN_BILLBOARD_DETAIL] });

    const response = await request(app)
      .get(`${BASE_PATH}/1`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toEqual({ data: MOCK_MOVIE_IN_BILLBOARD_DETAIL });

    const [, binds] = controllerCall(connection);

    expect(binds).toEqual({ id: 1 });
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns 404 when the movie in billboard does not exist', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app)
      .get(`${BASE_PATH}/99`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(404);

    expect(response.body.message).toBe('No se encontró la película en cartelera.');
  });

  test('Returns 400 when the ID is not a positive integer', async () => {
    mockDatabase();

    await request(app)
      .get(`${BASE_PATH}/-1`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(400);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    await request(app)
      .get(`${BASE_PATH}/1`)
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(500);

    expect(connection.close).toHaveBeenCalledTimes(2);
  });
});
