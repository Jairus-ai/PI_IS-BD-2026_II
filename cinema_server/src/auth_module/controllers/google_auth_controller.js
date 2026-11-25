import { createOAuthController } from './oauth_controller.js';
import { GOOGLE } from '../services/oauth_providers.js';

export const {
  start: startGoogleLogin,
  callback: handleGoogleCallback,
  getPending: getPendingGoogleSignUp,
  complete: completeGoogleSignUp
} = createOAuthController(GOOGLE);