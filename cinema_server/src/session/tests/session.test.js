import { afterEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import oracledb from 'oracledb';

import { ROLES, createSessionToken, requireSession, SESSION_COOKIE_NAME } from '../session.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(cookieParser());
app.get('/protected', requireSession(), (req, res) => {
  res.status(200).json({ user: req.user });
});
app.get('/workers-only', requireSession([ROLES.ADMINISTRATOR]), (req, res) => {
  res.status(200).json({ user: req.user });
});

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

function mockStoredSessionVersion(sessionVersion) {
  const connection = {
    execute: jest.fn().mockResolvedValue({ rows: [[sessionVersion]] }),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('requireSession', () => {
  test('Allows a request with a valid session and renews the cookie', async () => {
    mockStoredSessionVersion(0);
    const token = createSessionToken({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.user).toEqual({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=/);
  });

  test('Rejects a request without a session with 401', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);

    expect(response.body.message).toBe('La sesión expiró. Inicia sesión de nuevo');
  });

  test('Rejects an expired session with 401', async () => {
    const expiredToken = jwt.sign({ role: ROLES.CLIENT, sessionVersion: 0 }, process.env.JWT_SECRET, {
      subject: '7',
      expiresIn: -10
    });

    await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(expiredToken))
      .expect(401);
  });

  test('Rejects a session signed with another secret with 401', async () => {
    const forgedToken = jwt.sign({ role: ROLES.CLIENT, sessionVersion: 0 }, 'another-secret', { subject: '7' });

    await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(forgedToken))
      .expect(401);
  });

  test('Rejects a session closed with log out with 401', async () => {
    mockStoredSessionVersion(1);
    const oldToken = createSessionToken({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });

    await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(oldToken))
      .expect(401);
  });

  test('Rejects a role that is not allowed with 403', async () => {
    mockStoredSessionVersion(0);
    const token = createSessionToken({ id: 7, role: ROLES.CLIENT, sessionVersion: 0 });

    await request(app)
      .get('/workers-only')
      .set('Cookie', sessionCookie(token))
      .expect(403);
  });
});
