import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  buildFacebookAuthorizationUrl,
  fetchFacebookProfile
} from '../services/facebook_oauth_service.js';

const ENV = {
  JWT_SECRET: 'test-secret',
  FACEBOOK_APP_ID: 'test-app-id',
  FACEBOOK_APP_SECRET: 'test-app-secret',
  FACEBOOK_CALLBACK_URL: 'http://localhost:3000/auth/facebook/callback',
  FACEBOOK_GRAPH_VERSION: 'v99.0'
};
const originalFetch = global.fetch;
const previousEnv = {};

const createResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

function mockGraph(profile = {}, { tokenResponse, profileResponse } = {}) {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(tokenResponse ?? {
      ok: true,
      json: async () => ({ access_token: 'fb-token' })
    })
    .mockResolvedValueOnce(profileResponse ?? {
      ok: true,
      json: async () => ({
        id: 'fb-1',
        email: 'Ana@Gmail.com',
        first_name: 'Juan',
        middle_name: 'Carlos',
        last_name: 'Pérez Mora',
        ...profile
      })
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

describe('buildFacebookAuthorizationUrl', () => {
  it('builds the dialog URL with state and stores the state cookie', () => {
    const res = createResponse();

    const url = new URL(buildFacebookAuthorizationUrl(res));

    expect(url.origin + url.pathname).toBe('https://www.facebook.com/v99.0/dialog/oauth');
    expect(url.searchParams.get('client_id')).toBe('test-app-id');
    expect(url.searchParams.get('redirect_uri')).toBe(ENV.FACEBOOK_CALLBACK_URL);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('public_profile,email');
    expect(url.searchParams.get('state')).toBeTruthy();
    expect(url.searchParams.has('code_challenge')).toBe(false);

    expect(res.cookie).toHaveBeenCalledWith(
      'oauth_facebook_state',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, path: '/auth/facebook', maxAge: 10 * 60 * 1000 })
    );
  });

  it('fails when the Facebook configuration is missing', () => {
    delete process.env.FACEBOOK_GRAPH_VERSION;

    expect(() => buildFacebookAuthorizationUrl(createResponse())).toThrow('FACEBOOK_GRAPH_VERSION');
  });
});

describe('fetchFacebookProfile', () => {
  it('exchanges the code and reads the requested profile fields', async () => {
    mockGraph();

    const profile = await fetchFacebookProfile('code-123');

    expect(profile).toEqual({
      providerUserId: 'fb-1',
      email: 'ana@gmail.com',
      emailVerified: true,
      firstName: 'Juan',
      middleName: 'Carlos',
      firstSurname: 'Pérez',
      lastSurname: 'Mora'
    });

    const tokenUrl = new URL(global.fetch.mock.calls[0][0]);
    expect(tokenUrl.origin + tokenUrl.pathname).toBe('https://graph.facebook.com/v99.0/oauth/access_token');
    expect(tokenUrl.searchParams.get('code')).toBe('code-123');
    expect(tokenUrl.searchParams.get('client_id')).toBe('test-app-id');
    expect(tokenUrl.searchParams.get('client_secret')).toBe('test-app-secret');
    expect(tokenUrl.searchParams.get('redirect_uri')).toBe(ENV.FACEBOOK_CALLBACK_URL);

    const profileUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(profileUrl.pathname).toBe('/v99.0/me');
    expect(profileUrl.searchParams.get('fields')).toBe('id,email,first_name,middle_name,last_name');
    expect(profileUrl.searchParams.get('access_token')).toBe('fb-token');
  });

  it('splits the middle name from the first name when Facebook sends none', async () => {
    mockGraph({ first_name: 'Juan Carlos', middle_name: undefined });

    const profile = await fetchFacebookProfile('c');

    expect(profile).toMatchObject({ firstName: 'Juan', middleName: 'Carlos' });
  });

  it('returns an empty, unverified email when Facebook sends none', async () => {
    mockGraph({ email: undefined });

    const profile = await fetchFacebookProfile('c');

    expect(profile).toMatchObject({ email: '', emailVerified: false });
  });

  it('converts a numeric id to a string', async () => {
    mockGraph({ id: 12345 });

    expect((await fetchFacebookProfile('c')).providerUserId).toBe('12345');
  });

  it('throws when the token exchange fails', async () => {
    mockGraph({}, { tokenResponse: { ok: false, status: 400 } });

    await expect(fetchFacebookProfile('c')).rejects.toThrow('Facebook token exchange failed with status 400');
  });

  it('throws when no access token comes back', async () => {
    mockGraph({}, { tokenResponse: { ok: true, json: async () => ({}) } });

    await expect(fetchFacebookProfile('c')).rejects.toThrow('access token');
  });

  it('throws when the profile request fails', async () => {
    mockGraph({}, { profileResponse: { ok: false, status: 400 } });

    await expect(fetchFacebookProfile('c')).rejects.toThrow('Facebook profile request failed with status 400');
  });

  it('throws when the profile has no id', async () => {
    mockGraph({ id: undefined });

    await expect(fetchFacebookProfile('c')).rejects.toThrow('no id');
  });
});