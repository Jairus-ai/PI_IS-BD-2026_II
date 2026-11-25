import jwt from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  clearPendingSignUp,
  consumeOAuthState,
  readPendingSignUp,
  storeOAuthState,
  storePendingSignUp
} from '../services/oauth_cookie_service.js';

const SECRET = 'test-secret';
let previousSecret;

const createResponse = () => ({ cookie: jest.fn(), clearCookie: jest.fn() });

beforeEach(() => {
  previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
});

afterEach(() => {
  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
});

describe.each([
  ['GOOGLE', 'google', 'FACEBOOK'],
  ['FACEBOOK', 'facebook', 'GOOGLE']
])('%s cookies', (provider, prefix, otherProvider) => {
  const stateCookie = `oauth_${prefix}_state`;
  const pendingCookie = `oauth_${prefix}_pending`;

  function tokenFor(storeFn, ...args) {
    const res = createResponse();
    storeFn(res, ...args);
    return res.cookie.mock.calls[0][1];
  }

  it('stores the state in an httpOnly cookie scoped to the provider path', () => {
    const res = createResponse();

    storeOAuthState(res, provider, { state: 's', codeVerifier: 'v' });

    expect(res.cookie).toHaveBeenCalledWith(
      stateCookie,
      expect.any(String),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: `/auth/${prefix}`,
        maxAge: 10 * 60 * 1000
      })
    );
  });

  it('returns the stored state once and clears the cookie', () => {
    const token = tokenFor(storeOAuthState, provider, { state: 's', codeVerifier: 'v' });
    const res = createResponse();

    const payload = consumeOAuthState({ cookies: { [stateCookie]: token } }, res, provider);

    expect(payload).toMatchObject({ state: 's', codeVerifier: 'v' });
    expect(res.clearCookie).toHaveBeenCalledWith(
      stateCookie,
      expect.objectContaining({ path: `/auth/${prefix}` })
    );
  });

  it('returns null (and still clears) when there is no cookie', () => {
    const res = createResponse();

    expect(consumeOAuthState({ cookies: {} }, res, provider)).toBeNull();
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
  });

  it('rejects a token signed with another secret', () => {
    const forged = jwt.sign({ purpose: `${prefix}_state`, state: 'x' }, 'otra-clave');

    expect(
      consumeOAuthState({ cookies: { [stateCookie]: forged } }, createResponse(), provider)
    ).toBeNull();
  });

  it('rejects a state token issued for another provider', () => {
    const otherToken = tokenFor(storeOAuthState, otherProvider, { state: 's' });

    expect(
      consumeOAuthState({ cookies: { [stateCookie]: otherToken } }, createResponse(), provider)
    ).toBeNull();
  });

  it('stores the pending profile and reads it back', () => {
    const profile = { providerUserId: 'id-1', email: 'ana@gmail.com' };
    const res = createResponse();

    storePendingSignUp(res, provider, profile);

    const [name, token, options] = res.cookie.mock.calls[0];
    expect(name).toBe(pendingCookie);
    expect(options).toMatchObject({ path: `/auth/${prefix}`, maxAge: 15 * 60 * 1000 });
    expect(readPendingSignUp({ cookies: { [pendingCookie]: token } }, provider)).toMatchObject(profile);
  });

  it('does not accept a state token as a pending sign up', () => {
    const stateToken = tokenFor(storeOAuthState, provider, { state: 's' });

    expect(readPendingSignUp({ cookies: { [pendingCookie]: stateToken } }, provider)).toBeNull();
  });

  it('does not accept a pending token from another provider', () => {
    const otherToken = tokenFor(storePendingSignUp, otherProvider, { email: 'a@b.com' });

    expect(readPendingSignUp({ cookies: { [pendingCookie]: otherToken } }, provider)).toBeNull();
  });

  it('returns null without a pending cookie and clears it on request', () => {
    const res = createResponse();

    expect(readPendingSignUp({ cookies: {} }, provider)).toBeNull();
    clearPendingSignUp(res, provider);

    expect(res.clearCookie).toHaveBeenCalledWith(
      pendingCookie,
      expect.objectContaining({ path: `/auth/${prefix}` })
    );
  });
});