import { buildOAuthProfile } from './oauth_profile_service.js';
import { createRandomToken, storeOAuthState } from './oauth_cookie_service.js';

export const FACEBOOK_PROVIDER = 'FACEBOOK';

const FACEBOOK_DIALOG_URL = 'https://www.facebook.com';
const GRAPH_URL = 'https://graph.facebook.com';
const PROFILE_FIELDS = 'id,email,first_name,middle_name,last_name';

function getFacebookConfig() {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_CALLBACK_URL;
  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION;

  if (!appId || !appSecret || !redirectUri || !graphVersion) {
    throw new Error(
      'FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_CALLBACK_URL and FACEBOOK_GRAPH_VERSION must be defined in .env'
    );
  }
  return { appId, appSecret, redirectUri, graphVersion };
}

export function buildFacebookAuthorizationUrl(res) {
  const { appId, redirectUri, graphVersion } = getFacebookConfig();
  const state = createRandomToken();

  storeOAuthState(res, FACEBOOK_PROVIDER, { state });

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'public_profile,email',
    state
  });

  return `${FACEBOOK_DIALOG_URL}/${graphVersion}/dialog/oauth?${params}`;
}

async function requestGraphJson(url, description) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${description} failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchFacebookProfile(code) {
  const { appId, appSecret, redirectUri, graphVersion } = getFacebookConfig();

  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code
  });
  const { access_token: accessToken } = await requestGraphJson(
    `${GRAPH_URL}/${graphVersion}/oauth/access_token?${tokenParams}`,
    'Facebook token exchange'
  );
  if (!accessToken) {
    throw new Error('Facebook did not return an access token');
  }

  const profileParams = new URLSearchParams({
    fields: PROFILE_FIELDS,
    access_token: accessToken
  });
  const data = await requestGraphJson(
    `${GRAPH_URL}/${graphVersion}/me?${profileParams}`,
    'Facebook profile request'
  );
  if (!data.id) {
    throw new Error('Facebook profile has no id');
  }

  return buildOAuthProfile({
    providerUserId: data.id,
    email: data.email,
    emailVerified: Boolean(data.email),
    givenName: data.first_name,
    middleName: data.middle_name,
    familyName: data.last_name
  });
}