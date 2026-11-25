import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import oracledb from 'oracledb';

const mockSendWelcomeEmail = jest.fn().mockResolvedValue();

jest.unstable_mockModule('../../email/email_service.js', () => ({
  default: {
    sendWelcomeEmail: mockSendWelcomeEmail,
    sendPasswordRecoveryEmail: jest.fn().mockResolvedValue(),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue()
  }
}));

const CLIENT_ORIGIN = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_ORIGIN = CLIENT_ORIGIN;
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3000/auth/google/callback';

const { default: authRoutes } = await import('../routes/auth_routes.js');
const { ROLES, SESSION_COOKIE_NAME } = await import('../../session/session.js');

const STATE_COOKIE = 'oauth_google_state';
const PENDING_COOKIE = 'oauth_google_pending';
const originalFetch = global.fetch;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use((error, req, res, next) => {
  res.status(error.status || 500).json({ message: error.message });
});

const SIGN_UP_BODY = {
  identificationType: 'C',
  identificationNumber: '123456789',
  birthdate: '1995-05-10',
  phoneNumber: '88888888'
};

function mockDatabaseConnection(executeImplementation) {
  const connection = {
    execute: jest.fn(executeImplementation),
    commit: jest.fn().mockResolvedValue(),
    rollback: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue()
  };
  jest.spyOn(oracledb, 'getConnection').mockResolvedValue(connection);
  return connection;
}

function mockGoogleDatabase({ linked = null, worker = false, existing = null } = {}) {
  return mockDatabaseConnection(async (sql) => {
    if (sql.includes('oi.PROVIDER')) {
      return { rows: linked ? [linked] : [] };
    }
    if (sql.includes('FROM PI_DEVELOPERS.WORKERS')) {
      return { rows: worker ? [{ FOUND: 1 }] : [] };
    }
    if (sql.includes('c.EMAIL = :email')) {
      return { rows: existing ? [existing] : [] };
    }
    return { rowsAffected: 1 };
  });
}

function mockSignUpDatabase({ identificationExists = 0, clientInsertError } = {}) {
  return mockDatabaseConnection(async (sql) => {
    if (sql.includes('IDENTIFICATION_EXISTS')) {
      return { rows: [{ EMAIL_EXISTS: 0, IDENTIFICATION_EXISTS: identificationExists }] };
    }
    if (sql.includes('INSERT INTO PI_DEVELOPERS.CLIENTS')) {
      if (clientInsertError) {
        throw clientInsertError;
      }
      return { outBinds: { idClient: [101] } };
    }
    return { rowsAffected: 1 };
  });
}

function findCall(connection, fragment) {
  return connection.execute.mock.calls.find(([sql]) => sql.includes(fragment));
}

function cookieHeader(response, name) {
  const setCookie = (response.headers['set-cookie'] ?? [])
    .find((cookie) => cookie.startsWith(`${name}=`));
  return setCookie?.split(';')[0];
}

function cookieValue(response, name) {
  return cookieHeader(response, name)?.slice(name.length + 1);
}

function sessionPayload(response) {
  const token = cookieValue(response, SESSION_COOKIE_NAME);
  return token ? jwt.decode(token) : null;
}

// Simula la respuesta de Google (no se llama a Google de verdad)
function mockGoogleToken(claims = {}) {
  const idToken = jwt.sign(
    {
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
      sub: 'sub-1',
      email: 'Juan@Gmail.com',
      email_verified: true,
      given_name: 'Juan Carlos',
      family_name: 'Pérez Mora',
      exp: Math.floor(Date.now() / 1000) + 300,
      ...claims
    },
    'clave-de-google'
  );
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: idToken })
  });
}

async function beginGoogleLogin() {
  const response = await request(app).get('/auth/google').expect(302);
  return {
    state: new URL(response.headers.location).searchParams.get('state'),
    cookie: cookieHeader(response, STATE_COOKIE)
  };
}


async function runCallback({ claims = {}, query = {}, withStateCookie = true } = {}) {
  const flow = await beginGoogleLogin();
  mockGoogleToken(claims);

  const callbackRequest = request(app)
    .get('/auth/google/callback')
    .query({ code: 'code-123', state: flow.state, ...query });

  return withStateCookie ? callbackRequest.set('Cookie', flow.cookie) : callbackRequest;
}


async function pendingSignUpCookie(claims = {}) {
  mockGoogleDatabase();
  const response = await runCallback({ claims });
  return cookieHeader(response, PENDING_COOKIE);
}



beforeEach(() => {
  mockSendWelcomeEmail.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});


describe('GET /auth/google', () => {
  test('redirects to Google with state and PKCE and sets the state cookie', async () => {
    const response = await request(app).get('/auth/google').expect(302);

    const url = new URL(response.headers.location);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/auth/google/callback');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeTruthy();

    const stateCookie = response.headers['set-cookie'].find((c) => c.startsWith(`${STATE_COOKIE}=`));
    expect(stateCookie).toMatch(/HttpOnly/);
    expect(stateCookie).toMatch(/Path=\/auth\/google/);
    expect(stateCookie).not.toMatch(/Secure/);
  });

  test('returns 500 when the Google configuration is missing', async () => {
    const previous = process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;

    try {
      const response = await request(app).get('/auth/google').expect(500);
      expect(response.body.message).toMatch(/GOOGLE_CLIENT_ID/);
    } finally {
      process.env.GOOGLE_CLIENT_ID = previous;
    }
  });
});

describe('GET /auth/google/callback', () => {
  test('a new email redirects to complete the sign up and does not open a session', async () => {
    const connection = mockGoogleDatabase();

    const response = await runCallback();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/signup/google`);
    expect(cookieValue(response, PENDING_COOKIE)).toBeTruthy();
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(findCall(connection, 'UPDATE')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('an already linked Google account logs in with its current session version', async () => {
    const connection = mockGoogleDatabase({ linked: { ID: 9, SESSION_VERSION: 4 } });

    const response = await runCallback();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/`);
    expect(sessionPayload(response)).toMatchObject({
      sub: '9',
      role: ROLES.CLIENT,
      sessionVersion: 4
    });
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(findCall(connection, 'UPDATE')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('an existing client is linked, loses the old password and logs in', async () => {
    const connection = mockGoogleDatabase({ existing: { ID: 7, SESSION_VERSION: 2 } });

    const response = await runCallback();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/`);

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES')[1]).toEqual({
      provider: 'GOOGLE',
      providerUserId: 'sub-1',
      idClient: 7
    });

    const updateBinds = findCall(connection, 'UPDATE PI_DEVELOPERS.CREDENTIALS')[1];
    expect(updateBinds.id).toBe(7);
    expect(updateBinds.sessionVersion).toBe(3);
    expect(updateBinds.passwordHash).toMatch(/^\$2[aby]\$/);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(sessionPayload(response)).toMatchObject({ sub: '7', sessionVersion: 3 });
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('a worker email is rejected without a session', async () => {
    const connection = mockGoogleDatabase({ worker: true });

    const response = await runCallback({ claims: { email: 'Admin@CinePI.com' } });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_staff_not_allowed`);
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
    expect(findCall(connection, 'FROM PI_DEVELOPERS.WORKERS')[1]).toEqual({ email: 'admin@cinepi.com' });
    expect(findCall(connection, 'INSERT')).toBeUndefined();
  });

  test('an unverified Google email is rejected before touching the database', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await runCallback({ claims: { email_verified: false } });

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_email_not_verified`);
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('the user cancelling in Google redirects with google_cancelled', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await runCallback({ query: { error: 'access_denied' } });

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_cancelled`);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('a state that does not match is rejected without calling Google', async () => {
    const response = await runCallback({ query: { state: 'estado-falso' } });

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_state_invalid`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a missing state cookie is rejected without calling Google', async () => {
    const response = await runCallback({ withStateCookie: false });

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_state_invalid`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('the state cookie is cleared after the callback', async () => {
    mockGoogleDatabase();

    const response = await runCallback();

    const cleared = response.headers['set-cookie'].find((c) => c.startsWith(`${STATE_COOKIE}=;`));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
  });

  test('a Google token error redirects with google_failed', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const flow = await beginGoogleLogin();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });

    const response = await request(app)
      .get('/auth/google/callback')
      .query({ code: 'code-123', state: flow.state })
      .set('Cookie', flow.cookie);

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_failed`);
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
  });

  test('a database error rolls back, releases the connection and redirects with google_failed', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const connection = mockDatabaseConnection(async () => {
      throw new Error('ORA-00000');
    });

    const response = await runCallback();

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/login?error=google_failed`);
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

describe('GET /auth/google/pending', () => {
  test('returns 401 without a pending sign up', async () => {
    const response = await request(app).get('/auth/google/pending').expect(401);

    expect(response.body.message).toBe('El registro expiró. Intenta de nuevo');
  });

  test('returns only the profile data needed to prefill the form', async () => {
    const cookie = await pendingSignUpCookie();

    const response = await request(app)
      .get('/auth/google/pending')
      .set('Cookie', cookie)
      .expect(200);

    expect(response.body.data).toEqual({
      email: 'juan@gmail.com',
      firstName: 'Juan',
      middleName: 'Carlos',
      firstSurname: 'Pérez',
      lastSurname: 'Mora'
    });
  });

  test('does not accept a session token in place of the pending cookie', async () => {
    const sessionToken = jwt.sign({ sub: '7', role: ROLES.CLIENT, sessionVersion: 0 }, 'test-secret');

    await request(app)
      .get('/auth/google/pending')
      .set('Cookie', `${PENDING_COOKIE}=${sessionToken}`)
      .expect(401);
  });
});

describe('POST /auth/google/complete', () => {
  test('returns 401 without a pending sign up', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    await request(app).post('/auth/google/complete').send(SIGN_UP_BODY).expect(401);

    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('returns 400 with field errors and does not touch the database', async () => {
    const cookie = await pendingSignUpCookie();
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');
    getConnectionSpy.mockClear();

    const response = await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send({ identificationType: 'C', identificationNumber: '123' })
      .expect(400);

    expect(response.body.errors).toMatchObject({
      identificationNumber: 'La cédula debe tener 9 dígitos, sin guiones',
      birthdate: 'Campo obligatorio',
      phoneNumber: 'Campo obligatorio'
    });
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('returns 409 when the identification already exists', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase({ identificationExists: 1 });

    const response = await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send(SIGN_UP_BODY)
      .expect(409);

    expect(response.body.errors.identificationNumber).toBe('Ya existe un usuario con esa identificación');
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('creates the client, credential and link, then opens a session', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase();

    const response = await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send(SIGN_UP_BODY)
      .expect(201);

    expect(response.body.data).toEqual({
      id: 101,
      role: ROLES.CLIENT,
      email: 'juan@gmail.com',
      firstName: 'Juan',
      firstSurname: 'Pérez'
    });

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.CLIENTS')[1]).toMatchObject({
      email: 'juan@gmail.com',
      firstName: 'Juan',
      firstSurname: 'Pérez',
      identificationType: 'C',
      identificationNumber: '123456789'
    });

    const credentialBinds = findCall(connection, 'INSERT INTO PI_DEVELOPERS.CREDENTIALS')[1];
    expect(credentialBinds.idClient).toBe(101);
    expect(credentialBinds.passwordHash).toMatch(/^\$2[aby]\$/);

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES')[1]).toEqual({
      provider: 'GOOGLE',
      providerUserId: 'sub-1',
      idClient: 101
    });

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(sessionPayload(response)).toMatchObject({ sub: '101', role: ROLES.CLIENT, sessionVersion: 0 });

    const clearedPending = response.headers['set-cookie']
      .find((c) => c.startsWith(`${PENDING_COOKIE}=;`));
    expect(clearedPending).toBeDefined();

    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail.mock.calls[0][0]).toMatchObject({ email: 'juan@gmail.com' });
  });

  test('ignores an email sent in the body and uses the Google one', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase();

    await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send({ ...SIGN_UP_BODY, email: 'otro@correo.com' })
      .expect(201);

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.CLIENTS')[1].email).toBe('juan@gmail.com');
  });

  test('returns 409 and rolls back on a unique constraint violation', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase({
      clientInsertError: Object.assign(new Error('ORA-00001'), { errorNum: 1 })
    });

    const response = await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send(SIGN_UP_BODY)
      .expect(409);

    expect(response.body.message).toBe('Ya existe un usuario con esos datos');
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.commit).not.toHaveBeenCalled();
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('returns 500 and rolls back on an unexpected database error', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase({ clientInsertError: new Error('boom') });

    await request(app)
      .post('/auth/google/complete')
      .set('Cookie', cookie)
      .send(SIGN_UP_BODY)
      .expect(500);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });
});