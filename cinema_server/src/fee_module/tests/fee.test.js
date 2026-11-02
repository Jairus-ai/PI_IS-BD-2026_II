import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import oracledb from 'oracledb';

import feeRoutes from '../routes/fee_routes.js';
import { ROLES, SESSION_COOKIE_NAME, createSessionToken } from '../../session/session.js';

process.env.JWT_SECRET = 'test-secret';

const SESSION_VERSION = 0;

const MOCK_FEES = [
  { ID_FEE: 1, TYPE: 'G', AMOUNT: 4500, ID_AUDIOVISUAL_FORMAT: 3, AUDIOVISUAL_FORMAT_NAME: 'DCP 2K + 5.1 Surround' },
  { ID_FEE: 2, TYPE: 'N', AMOUNT: 3500, ID_AUDIOVISUAL_FORMAT: 3, AUDIOVISUAL_FORMAT_NAME: 'DCP 2K + 5.1 Surround' }
];

const app = express();
app.use(cookieParser());
app.use('/management/fees', feeRoutes);
app.use((error, req, res, next) => {
  res.status(500).json({ message: error.message });
});
//first query reads the session version, the next ones belong to the controller
function sessionCookie(role) {
  const token = createSessionToken({ id: 1, role, sessionVersion: SESSION_VERSION });
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

describe('GET /management/fees', () => {
  test('Returns the active fees for an administrator', async () => {
    const connection = mockDatabase({ rows: MOCK_FEES });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.data).toEqual(MOCK_FEES);
    expect(connection.execute.mock.calls[1][0]).toMatch(/IS_DELETED = 0/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Returns the active fees for a superuser', async () => {
    mockDatabase({ rows: MOCK_FEES });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.SUPERUSER))
      .expect(200);

    expect(response.body.data).toHaveLength(2);
  });

  test('Returns an empty list when there are no fees', async () => {
    mockDatabase({ rows: [] });

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(200);

    expect(response.body.data).toEqual([]);
  });

  test('Returns 500 and closes the connection when the query fails', async () => {
    const connection = mockDatabase(new Error('ORA-00942: table or view does not exist'));

    const response = await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.ADMINISTRATOR))
      .expect(500);

    expect(response.body.message).toMatch(/ORA-00942/);
    expect(connection.close).toHaveBeenCalledTimes(2);
  });

  test('Rejects a request without a session with 401', async () => {
    await request(app).get('/management/fees').expect(401);
  });

  test('Rejects an employee with 403', async () => {
    const connection = mockDatabase();

    await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.EMPLOYEE))
      .expect(403);

    expect(connection.execute).toHaveBeenCalledTimes(1);
  });

  test('Rejects a client with 403', async () => {
    mockDatabase();

    await request(app)
      .get('/management/fees')
      .set('Cookie', sessionCookie(ROLES.CLIENT))
      .expect(403);
  });
});
