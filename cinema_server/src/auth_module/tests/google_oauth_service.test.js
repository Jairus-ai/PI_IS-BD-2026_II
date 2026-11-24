import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildGoogleAuthorizationUrl,
  consumeGoogleState,
  fetchGoogleProfile,
  storePendingSignUp,
  readPendingSignUp
} from '../services/google_oauth_service.js';

const ENV = {
  JWT_SECRET: 'test-secret',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_REDIRECT_URI: 'http://localhost:3000/auth/google/callback'
};

const STATE_COOKIE = 'oauth_google_state';
const PENDING_COOKIE = 'oauth_google_pending';
const originalFetch = global.fetch;
const previousEnv = {};

const createResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

// Simula el id_token que devolvería Google (la firma no se verifica en el servicio)
function makeIdToken(claims = {}) {
  return jwt.sign(
    {
      iss: 'https://accounts.google.com',
      aud: 'test-client-id',
      sub: 'sub-1',
      email: 'Ana@Gmail.com',
      email_verified: true,
      given_name: 'Juan Carlos',
      family_name: 'Pérez Mora',
      exp: Math.floor(Date.now() / 1000) + 300,
      ...claims
    },
    'cualquier-clave'
  );
}

function mockGoogleTokenResponse(idToken) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ id_token: idToken })
  });
}

beforeEach(() => {
  for (const [key, value] of Object.entries(ENV)) {
    previousEnv[key] = process.env[key];
    process.env[key] = value;
  }
});

afterEach(() => {
  for (const key of Object.keys(ENV)) {
    if (previousEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previousEnv[key];
    }
  }
  global.fetch = originalFetch;
});

describe('buildGoogleAuthorizationUrl', () => {
  it('builds the Google URL with state and PKCE and stores a state cookie', () => {
    const res = createResponse();

    const url = new URL(buildGoogleAuthorizationUrl(res));

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('test-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.GOOGLE_REDIRECT_URI);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBeTruthy();

    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledWith(
      STATE_COOKIE,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/auth/google',
        maxAge: 10 * 60 * 1000
      })
    );
  });

  it('fails when the Google configuration is missing', () => {
    delete process.env.GOOGLE_CLIENT_ID;

    expect(() => buildGoogleAuthorizationUrl(createResponse())).toThrow('GOOGLE_CLIENT_ID');
  });
});

describe('consumeGoogleState', () => {
  it('returns the stored state and a verifier that matches the code challenge', () => {
    const startResponse = createResponse();
    const url = new URL(buildGoogleAuthorizationUrl(startResponse));
    const token = startResponse.cookie.mock.calls[0][1];
    const callbackResponse = createResponse();

    const payload = consumeGoogleState({ cookies: { [STATE_COOKIE]: token } }, callbackResponse);

    expect(payload.state).toBe(url.searchParams.get('state'));
    const expectedChallenge = crypto
      .createHash('sha256')
      .update(payload.codeVerifier)
      .digest('base64url');
    expect(url.searchParams.get('code_challenge')).toBe(expectedChallenge);
    expect(callbackResponse.clearCookie).toHaveBeenCalledWith(
      STATE_COOKIE,
      expect.objectContaining({ path: '/auth/google' })
    );
  });

  it('returns null (and still clears the cookie) when there is no cookie', () => {
    const res = createResponse();

    expect(consumeGoogleState({ cookies: {} }, res)).toBeNull();
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ purpose: 'google_state', state: 'x', codeVerifier: 'y' }, 'otra-clave');

    expect(consumeGoogleState({ cookies: { [STATE_COOKIE]: forged } }, createResponse())).toBeNull();
  });

  it('rejects a token that was issued for another purpose', () => {
    const wrongPurpose = jwt.sign({ purpose: 'otro', state: 'x' }, ENV.JWT_SECRET);

    expect(
      consumeGoogleState({ cookies: { [STATE_COOKIE]: wrongPurpose } }, createResponse())
    ).toBeNull();
  });
});

describe('pending sign up cookie', () => {
  const profile = { providerUserId: 'sub-1', email: 'ana@gmail.com', firstName: 'Ana' };

  it('stores the profile and reads it back', () => {
    const res = createResponse();

    storePendingSignUp(res, profile);

    const [name, token, options] = res.cookie.mock.calls[0];
    expect(name).toBe(PENDING_COOKIE);
    expect(options).toMatchObject({ httpOnly: true, path: '/auth/google' });
    expect(readPendingSignUp({ cookies: { [PENDING_COOKIE]: token } })).toMatchObject(profile);
  });

  it('does not accept a state token in the pending cookie', () => {
    const stateToken = jwt.sign({ purpose: 'google_state', state: 'x' }, ENV.JWT_SECRET);

    expect(readPendingSignUp({ cookies: { [PENDING_COOKIE]: stateToken } })).toBeNull();
  });

  it('returns null when the cookie is missing', () => {
    expect(readPendingSignUp({ cookies: {} })).toBeNull();
  });
});

describe('fetchGoogleProfile', () => {
  it('exchanges the code and maps the profile', async () => {
    mockGoogleTokenResponse(makeIdToken());

    const profile = await fetchGoogleProfile('code-123', 'verifier-456');

    expect(profile).toEqual({
      providerUserId: 'sub-1',
      email: 'ana@gmail.com',
      emailVerified: true,
      firstName: 'Juan',
      middleName: 'Carlos',
      firstSurname: 'Pérez',
      lastSurname: 'Mora'
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(options.method).toBe('POST');
    expect(options.body.get('code')).toBe('code-123');
    expect(options.body.get('code_verifier')).toBe('verifier-456');
    expect(options.body.get('grant_type')).toBe('authorization_code');
    expect(options.body.get('client_secret')).toBe('test-client-secret');
  });

  it('reports an unverified email without throwing', async () => {
    mockGoogleTokenResponse(makeIdToken({ email_verified: false }));

    const profile = await fetchGoogleProfile('c', 'v');

    expect(profile.emailVerified).toBe(false);
  });

  it('throws when Google answers with an error status', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400 });

    await expect(fetchGoogleProfile('c', 'v')).rejects.toThrow('status 400');
  });

  it.each([
    ['another audience', { aud: 'otra-app' }],
    ['another issuer', { iss: 'https://evil.example.com' }],
    ['an expired token', { exp: Math.floor(Date.now() / 1000) - 60 }]
  ])('rejects an ID token with %s', async (_label, claims) => {
    mockGoogleTokenResponse(makeIdToken(claims));

    await expect(fetchGoogleProfile('c', 'v')).rejects.toThrow('Invalid Google ID token');
  });
});