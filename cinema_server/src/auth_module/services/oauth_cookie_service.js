import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { buildCookieOptions, getJwtSecret } from '../../session/session.js';

const STATE_MINUTES = 10;
const PENDING_MINUTES = 15;

export function createRandomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function cookieSettings(provider, kind) {
  const prefix = provider.toLowerCase();
  return {
    name: `oauth_${prefix}_${kind}`,
    purpose: `${prefix}_${kind}`,
    path: `/auth/${prefix}`
  };
}

function setSignedCookie(res, provider, kind, data, minutes) {
  const { name, purpose, path } = cookieSettings(provider, kind);
  const token = jwt.sign({ purpose, ...data }, getJwtSecret(), {
    expiresIn: `${minutes}m`
  });
  res.cookie(name, token, {
    ...buildCookieOptions(),
    maxAge: minutes * 60 * 1000,
    path
  });
}

function readSignedCookie(req, provider, kind) {
  const { name, purpose } = cookieSettings(provider, kind);
  const token = req.cookies?.[name];
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, getJwtSecret());
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

function clearSignedCookie(res, provider, kind) {
  const { name, path } = cookieSettings(provider, kind);
  res.clearCookie(name, { ...buildCookieOptions(), maxAge: undefined, path });
}

export function storeOAuthState(res, provider, data) {
  setSignedCookie(res, provider, 'state', data, STATE_MINUTES);
}

export function consumeOAuthState(req, res, provider) {
  const payload = readSignedCookie(req, provider, 'state');
  clearSignedCookie(res, provider, 'state');
  return payload;
}

export function storePendingSignUp(res, provider, profile) {
  setSignedCookie(res, provider, 'pending', { profile }, PENDING_MINUTES);
}

export function readPendingSignUp(req, provider) {
  return readSignedCookie(req, provider, 'pending')?.profile ?? null;
}

export function clearPendingSignUp(res, provider) {
  clearSignedCookie(res, provider, 'pending');
}