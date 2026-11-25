import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { buildOAuthProfile } from './oauth_profile_service.js';
import { createRandomToken, storeOAuthState } from './oauth_cookie_service.js';

export const GOOGLE_PROVIDER = 'GOOGLE';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

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

export function buildGoogleAuthorizationUrl(res) {
  const { clientId, redirectUri } = getGoogleConfig();
  const state = createRandomToken();
  const codeVerifier = createRandomToken();
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  storeOAuthState(res, GOOGLE_PROVIDER, { state, codeVerifier });

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

  return buildOAuthProfile({
    providerUserId: claims.sub,
    email: claims.email,
    emailVerified: claims.email_verified === true,
    givenName: claims.given_name,
    familyName: claims.family_name
  });
}