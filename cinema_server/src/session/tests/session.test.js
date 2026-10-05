import { describe, expect, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';

import { createSessionToken, requireSession, SESSION_COOKIE_NAME } from '../session.js';

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(cookieParser());
app.get('/protected', requireSession, (req, res) => {
  res.status(200).json({ user: req.user });
});

function sessionCookie(token) {
  return `${SESSION_COOKIE_NAME}=${token}`;
}

describe('requireSession', () => {
  test('Allows a request with a valid session and renews the cookie', async () => {
    const token = createSessionToken({ id: 7, role: 'CLIENT' });

    const response = await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(token))
      .expect(200);

    expect(response.body.user).toEqual({ id: 7, role: 'CLIENT' });
    expect(response.headers['set-cookie'].join(';')).toMatch(/session_token=/);
  });

  test('Rejects a request without a session with 401', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);

    expect(response.body.message).toBe('La sesión expiró. Inicia sesión de nuevo');
  });

  test('Rejects an expired session with 401', async () => {
    const expiredToken = jwt.sign({ role: 'CLIENT' }, process.env.JWT_SECRET, {
      subject: '7',
      expiresIn: -10
    });

    await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(expiredToken))
      .expect(401);
  });

  test('Rejects a session signed with another secret with 401', async () => {
    const forgedToken = jwt.sign({ role: 'CLIENT' }, 'another-secret', { subject: '7' });

    await request(app)
      .get('/protected')
      .set('Cookie', sessionCookie(forgedToken))
      .expect(401);
  });
});
