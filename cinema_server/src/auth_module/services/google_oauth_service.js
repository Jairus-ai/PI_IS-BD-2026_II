import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { buildCookieOptions, getJwtSecret } from '../../session/session.js';

export const GOOGLE_PROVIDER = 'GOOGLE';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const STATE_COOKIE_NAME = 'oauth_google_state';
const PENDING_COOKIE_NAME = 'oauth_google_pending';
const OAUTH_COOKIE_PATH = '/auth/google';
const STATE_MINUTES = 10;
const PENDING_MINUTES = 15;
const STATE_PURPOSE = 'google_state';
const PENDING_PURPOSE = 'google_pending_signup';

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must be defined in .env'
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function setSignedCookie(res, name, purpose, data, minutes) {
  const token = jwt.sign({ purpose, ...data }, getJwtSecret(), {
    expiresIn: `${minutes}m`
  });
  res.cookie(name, token, {
    ...buildCookieOptions(),
    maxAge: minutes * 60 * 1000,
    path: OAUTH_COOKIE_PATH
  });
}

function readSignedCookie(req, name, purpose) {
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

function clearSignedCookie(res, name) {
  res.clearCookie(name, {
    ...buildCookieOptions(),
    maxAge: undefined,
    path: OAUTH_COOKIE_PATH
  });
}

function splitWords(text) {
  const [first = '', ...rest] = String(text ?? '').trim().split(/\s+/);
  return [first, rest.join(' ')];
}

// Paso 1: crea state + PKCE, los guarda en cookie y devuelve la URL de Google
export function buildGoogleAuthorizationUrl(res) {
  const { clientId, redirectUri } = getGoogleConfig();
  const state = randomToken();
  const codeVerifier = randomToken();
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  setSignedCookie(res, STATE_COOKIE_NAME, STATE_PURPOSE, { state, codeVerifier }, STATE_MINUTES);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    prompt: 'select_account'
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export function consumeGoogleState(req, res) {
  const payload = readSignedCookie(req, STATE_COOKIE_NAME, STATE_PURPOSE);
  clearSignedCookie(res, STATE_COOKIE_NAME);
  return payload;
}

// Paso 2: cambia el code por los datos del usuario
export async function fetchGoogleProfile(code, codeVerifier) {
  const { clientId, clientSecret, redirectUri } = getGoogleConfig();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier
    })
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`);
  }

  const { id_token: idToken } = await response.json();

  const claims = jwt.decode(idToken);
  const isValid =
    claims
    && GOOGLE_ISSUERS.includes(claims.iss)
    && claims.aud === clientId
    && claims.exp * 1000 > Date.now();

  if (!isValid) {
    throw new Error('Invalid Google ID token');
  }

  const [firstName, middleName] = splitWords(claims.given_name);
  const [firstSurname, lastSurname] = splitWords(claims.family_name);

  return {
    providerUserId: claims.sub,
    email: String(claims.email ?? '').trim().toLowerCase(),
    emailVerified: claims.email_verified === true,
    firstName,
    middleName,
    firstSurname,
    lastSurname
  };
}

// Registro pendiente: Google ya validó al usuario pero faltan datos de CLIENTS
export function storePendingSignUp(res, profile) {
  setSignedCookie(res, PENDING_COOKIE_NAME, PENDING_PURPOSE, { profile }, PENDING_MINUTES);
}

export function readPendingSignUp(req) {
  return readSignedCookie(req, PENDING_COOKIE_NAME, PENDING_PURPOSE)?.profile ?? null;
}

export function clearPendingSignUp(res) {
  clearSignedCookie(res, PENDING_COOKIE_NAME);
}