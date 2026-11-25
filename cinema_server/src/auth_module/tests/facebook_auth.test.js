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
process.env.FACEBOOK_APP_ID = 'test-app-id';
process.env.FACEBOOK_APP_SECRET = 'test-app-secret';
process.env.FACEBOOK_CALLBACK_URL = 'http://localhost:3000/auth/facebook/callback';
process.env.FACEBOOK_GRAPH_VERSION = 'v99.0';

const { default: authRoutes } = await import('../routes/auth_routes.js');
const { ROLES, SESSION_COOKIE_NAME } = await import('../../session/session.js');

const STATE_COOKIE = 'oauth_facebook_state';
const PENDING_COOKIE = 'oauth_facebook_pending';
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

// ---------- helpers ----------

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

function mockOAuthDatabase({ linked = null, worker = false, existing = null } = {}) {
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

function expectLoginError(response, errorCode) {
  expect(response.status).toBe(302);
  expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/#/login?error=${errorCode}`);
}

// Simula Graph API (no se llama a Facebook de verdad): token y luego perfil
function mockFacebookGraph(profile = {}) {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'fb-token' }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'fb-1',
        email: 'Juan@Gmail.com',
        first_name: 'Juan',
        middle_name: 'Carlos',
        last_name: 'Pérez Mora',
        ...profile
      })
    });
}

async function beginFacebookLogin() {
  const response = await request(app).get('/auth/facebook').expect(302);
  return {
    state: new URL(response.headers.location).searchParams.get('state'),
    cookie: cookieHeader(response, STATE_COOKIE)
  };
}

// Recorre: /auth/facebook -> (Facebook) -> /auth/facebook/callback
async function runCallback({ profile = {}, query = {}, withStateCookie = true } = {}) {
  const flow = await beginFacebookLogin();
  mockFacebookGraph(profile);

  const callbackRequest = request(app)
    .get('/auth/facebook/callback')
    .query({ code: 'code-123', state: flow.state, ...query });

  return withStateCookie ? callbackRequest.set('Cookie', flow.cookie) : callbackRequest;
}

async function pendingSignUpCookie() {
  mockOAuthDatabase();
  const response = await runCallback();
  return cookieHeader(response, PENDING_COOKIE);
}

function postComplete(cookie, body = SIGN_UP_BODY) {
  const completeRequest = request(app).post('/auth/facebook/complete').send(body);
  return cookie ? completeRequest.set('Cookie', cookie) : completeRequest;
}

beforeEach(() => {
  mockSendWelcomeEmail.mockClear();
});

afterEach(() => {
  jest.restoreAllMocks();
  global.fetch = originalFetch;
});

// ---------- GET /auth/facebook ----------

describe('GET /auth/facebook', () => {
  test('redirects to Facebook with state and sets the state cookie', async () => {
    const response = await request(app).get('/auth/facebook').expect(302);

    const url = new URL(response.headers.location);
    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v99.0/dialog/oauth');
    expect(url.searchParams.get('client_id')).toBe('test-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(process.env.FACEBOOK_CALLBACK_URL);
    expect(url.searchParams.get('scope')).toBe('public_profile,email');
    expect(url.searchParams.get('state')).toBeTruthy();

    const stateCookie = response.headers['set-cookie'].find((c) => c.startsWith(`${STATE_COOKIE}=`));
    expect(stateCookie).toMatch(/HttpOnly/);
    expect(stateCookie).toMatch(/Path=\/auth\/facebook/);
    expect(stateCookie).not.toMatch(/Secure/);
  });

  test('returns 500 when the Facebook configuration is missing', async () => {
    const previous = process.env.FACEBOOK_APP_ID;
    delete process.env.FACEBOOK_APP_ID;

    try {
      const response = await request(app).get('/auth/facebook').expect(500);
      expect(response.body.message).toMatch(/FACEBOOK_APP_ID/);
    } finally {
      process.env.FACEBOOK_APP_ID = previous;
    }
  });
});

// ---------- GET /auth/facebook/callback ----------

describe('GET /auth/facebook/callback', () => {
  test('reads the profile from the Graph API with the expected requests', async () => {
    mockOAuthDatabase();

    await runCallback();

    const tokenUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(tokenUrl.pathname).toBe('/v99.0/oauth/access_token');
    expect(tokenUrl.searchParams.get('code')).toBe('code-123');
    expect(tokenUrl.searchParams.get('client_secret')).toBe('test-app-secret');

    const profileUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(profileUrl.pathname).toBe('/v99.0/me');
    expect(profileUrl.searchParams.get('fields')).toBe('id,email,first_name,middle_name,last_name');
    expect(profileUrl.searchParams.get('access_token')).toBe('fb-token');
  });

  test('a new email redirects to complete the sign up and does not open a session', async () => {
    const connection = mockOAuthDatabase();

    const response = await runCallback();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/#/signup/facebook`);
    expect(cookieValue(response, PENDING_COOKIE)).toBeTruthy();
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalledTimes(1);
  });

  test('an already linked Facebook account logs in with its current session version', async () => {
    const connection = mockOAuthDatabase({ linked: { ID: 9, SESSION_VERSION: 4 } });

    const response = await runCallback();

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/`);
    expect(sessionPayload(response)).toMatchObject({ sub: '9', role: ROLES.CLIENT, sessionVersion: 4 });
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(findCall(connection, 'UPDATE')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('an existing client is linked as FACEBOOK, loses the old password and logs in', async () => {
    const connection = mockOAuthDatabase({ existing: { ID: 7, SESSION_VERSION: 2 } });

    const response = await runCallback();

    expect(response.headers.location).toBe(`${CLIENT_ORIGIN}/`);
    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES')[1]).toEqual({
      provider: 'FACEBOOK',
      providerUserId: 'fb-1',
      idClient: 7
    });

    const updateBinds = findCall(connection, 'UPDATE PI_DEVELOPERS.CREDENTIALS')[1];
    expect(updateBinds.id).toBe(7);
    expect(updateBinds.sessionVersion).toBe(3);
    expect(updateBinds.passwordHash).toMatch(/^\$2[aby]\$/);

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(sessionPayload(response)).toMatchObject({ sub: '7', sessionVersion: 3 });
  });

  test('a worker email is rejected without a session', async () => {
    const connection = mockOAuthDatabase({ worker: true });

    const response = await runCallback({ profile: { email: 'Admin@CinePI.com' } });

    expectLoginError(response, 'facebook_staff_not_allowed');
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
    expect(findCall(connection, 'FROM PI_DEVELOPERS.WORKERS')[1]).toEqual({ email: 'admin@cinepi.com' });
  });

  test('a Facebook profile without email is rejected before touching the database', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await runCallback({ profile: { email: undefined } });

    expectLoginError(response, 'facebook_email_missing');
    expect(getConnectionSpy).not.toHaveBeenCalled();
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
  });

  test('the user denying access redirects with facebook_cancelled', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    const response = await runCallback({
      query: { error: 'access_denied', error_reason: 'user_denied' }
    });

    expectLoginError(response, 'facebook_cancelled');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('a state that does not match is rejected without calling Facebook', async () => {
    const response = await runCallback({ query: { state: 'estado-falso' } });

    expectLoginError(response, 'facebook_state_invalid');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a missing state cookie is rejected without calling Facebook', async () => {
    const response = await runCallback({ withStateCookie: false });

    expectLoginError(response, 'facebook_state_invalid');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a Graph API error redirects with facebook_failed', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const flow = await beginFacebookLogin();
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });

    const response = await request(app)
      .get('/auth/facebook/callback')
      .query({ code: 'code-123', state: flow.state })
      .set('Cookie', flow.cookie);

    expectLoginError(response, 'facebook_failed');
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
  });

  test('a database error rolls back, releases the connection and redirects with facebook_failed', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const connection = mockDatabaseConnection(async () => {
      throw new Error('ORA-00000');
    });

    const response = await runCallback();

    expectLoginError(response, 'facebook_failed');
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
  });
});

// ---------- GET /auth/facebook/pending ----------

describe('GET /auth/facebook/pending', () => {
  test('returns 401 without a pending sign up', async () => {
    const response = await request(app).get('/auth/facebook/pending').expect(401);

    expect(response.body.message).toBe('El registro expiró. Intenta de nuevo');
  });

  test('returns only the profile data needed to prefill the form', async () => {
    const cookie = await pendingSignUpCookie();

    const response = await request(app)
      .get('/auth/facebook/pending')
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

  test('does not accept a pending token that was issued for Google', async () => {
    const googleToken = jwt.sign(
      { purpose: 'google_pending', profile: { email: 'juan@gmail.com' } },
      'test-secret'
    );

    await request(app)
      .get('/auth/facebook/pending')
      .set('Cookie', `${PENDING_COOKIE}=${googleToken}`)
      .expect(401);
  });
});

// ---------- POST /auth/facebook/complete ----------

describe('POST /auth/facebook/complete', () => {
  test('returns 401 without a pending sign up', async () => {
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');

    await postComplete().expect(401);

    expect(getConnectionSpy).not.toHaveBeenCalled();
  });

  test('returns 400 with field errors and does not touch the database', async () => {
    const cookie = await pendingSignUpCookie();
    const getConnectionSpy = jest.spyOn(oracledb, 'getConnection');
    getConnectionSpy.mockClear();

    const response = await postComplete(cookie, { identificationType: 'C', identificationNumber: '123' })
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

    const response = await postComplete(cookie).expect(409);

    expect(response.body.errors.identificationNumber).toBe('Ya existe un usuario con esa identificación');
    expect(findCall(connection, 'INSERT')).toBeUndefined();
    expect(connection.commit).not.toHaveBeenCalled();
  });

  test('creates the client, credential and FACEBOOK link, then opens a session', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase();

    const response = await postComplete(cookie).expect(201);

    expect(response.body.data).toEqual({
      id: 101,
      role: ROLES.CLIENT,
      email: 'juan@gmail.com',
      firstName: 'Juan',
      firstSurname: 'Pérez'
    });

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.CLIENTS')[1]).toMatchObject({
      email: 'juan@gmail.com',
      identificationNumber: '123456789'
    });
    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.CREDENTIALS')[1].idClient).toBe(101);
    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.OAUTH_IDENTITIES')[1]).toEqual({
      provider: 'FACEBOOK',
      providerUserId: 'fb-1',
      idClient: 101
    });

    expect(connection.commit).toHaveBeenCalledTimes(1);
    expect(sessionPayload(response)).toMatchObject({ sub: '101', role: ROLES.CLIENT, sessionVersion: 0 });
    expect(response.headers['set-cookie'].find((c) => c.startsWith(`${PENDING_COOKIE}=;`))).toBeDefined();
    expect(mockSendWelcomeEmail).toHaveBeenCalledTimes(1);
  });

  test('ignores an email sent in the body and uses the Facebook one', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase();

    await postComplete(cookie, { ...SIGN_UP_BODY, email: 'otro@correo.com' }).expect(201);

    expect(findCall(connection, 'INSERT INTO PI_DEVELOPERS.CLIENTS')[1].email).toBe('juan@gmail.com');
  });

  test('returns 409 and rolls back on a unique constraint violation', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase({
      clientInsertError: Object.assign(new Error('ORA-00001'), { errorNum: 1 })
    });

    const response = await postComplete(cookie).expect(409);

    expect(response.body.message).toBe('Ya existe un usuario con esos datos');
    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(cookieValue(response, SESSION_COOKIE_NAME)).toBeFalsy();
  });

  test('returns 500 and rolls back on an unexpected database error', async () => {
    const cookie = await pendingSignUpCookie();
    const connection = mockSignUpDatabase({ clientInsertError: new Error('boom') });

    await postComplete(cookie).expect(500);

    expect(connection.rollback).toHaveBeenCalledTimes(1);
    expect(connection.close).toHaveBeenCalledTimes(1);
    expect(mockSendWelcomeEmail).not.toHaveBeenCalled();
  });
});