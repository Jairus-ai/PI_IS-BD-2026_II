import { createOAuthController } from './oauth_controller.js';
import { FACEBOOK } from '../services/oauth_providers.js';

export const {
  start: startFacebookLogin,
  callback: handleFacebookCallback,
  getPending: getPendingFacebookSignUp,
  complete: completeFacebookSignUp
} = createOAuthController(FACEBOOK);