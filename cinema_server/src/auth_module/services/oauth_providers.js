import {
  GOOGLE_PROVIDER,
  buildGoogleAuthorizationUrl,
  fetchGoogleProfile
} from './google_oauth_service.js';
import {
  FACEBOOK_PROVIDER,
  buildFacebookAuthorizationUrl,
  fetchFacebookProfile
} from './facebook_oauth_service.js';

export const GOOGLE = {
  name: GOOGLE_PROVIDER,
  signUpPath: '/#/signup/google',
  buildAuthorizationUrl: buildGoogleAuthorizationUrl,
  fetchProfile: (code, { codeVerifier }) => fetchGoogleProfile(code, codeVerifier)
};

export const FACEBOOK = {
  name: FACEBOOK_PROVIDER,
  signUpPath: '/#/signup/facebook',
  buildAuthorizationUrl: buildFacebookAuthorizationUrl,
  fetchProfile: (code) => fetchFacebookProfile(code)
};