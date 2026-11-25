import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import screeningRoutes from '../routes/screening_routes.js';
import {
  ROLES,
  SESSION_COOKIE_NAME,
  createSessionToken
} from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const BASE_PATH = '/management/screenings';

const app = express();
app.use(cookieParser());
app.use(BASE_PATH, screeningRoutes);
app.use((error, req, res, next) => {
  res.status(error.status ?? 500).json({ message: error.message });
});

const COOKIE = `${SESSION_COOKIE_NAME}=${createSessionToken({
  id: 1,
  role: ROLES.EMPLOYEE,
  sessionVersion: 0
})}`;

function mockDatabase(response) {
  const execute = jest.fn()
    .mockResolvedValueOnce({ rows: [[0]] })
    .mockImplementationOnce(() =>
      response instanceof Error
        ? Promise.reject(response)
        : Promise.resolve(response)
    );

  jest.spyOn(oracledb, 'getConnection').mockResolvedValue({
    execute,
    close: jest.fn()
  });
}

function get(path) {
  return request(app)
    .get(`${BASE_PATH}${path}`)
    .set('Cookie', COOKIE);
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Screenings', () => {
  test('Returns the total with every filter', async () => {
    mockDatabase({ rows: [{ TOTAL: 3 }] });

    const response = await get('/count?locationId=1&audiovisualFormatId=2&ratingId=3&movieName=Incep');

    expect(response.body).toEqual({ total: 3 });
  });

  test('Returns a page of screenings', async () => {
    mockDatabase({ rows: [{ ID_SCREENING: 21 }] });

    const response = await get('?page=2&ratingId=');

    expect(response.body.data).toEqual([{ ID_SCREENING: 21 }]);
  });

  test('Returns the detail of a screening', async () => {
    mockDatabase({ rows: [{ ID_SCREENING: 21 }] });

    const response = await get('/21');

    expect(response.body.data).toEqual({ ID_SCREENING: 21 });
  });

  test('Returns 404 when the screening does not exist', async () => {
    mockDatabase({ rows: [] });

    await get('/99').expect(404);
  });

  test.each([
    '/count',
    '',
    '/21'
  ])('Returns 500 when the query of %p fails', async (path) => {
    mockDatabase(new Error('ORA-00942'));

    await get(path).expect(500);
  });
});
