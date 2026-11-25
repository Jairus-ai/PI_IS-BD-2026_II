import { normalizeUserData, validateUserData } from '../../shared/validators/user_data_validator.js';

export function validateOAuthSignUp(oauthProfile, body = {}) {
  const client = normalizeUserData({
    ...oauthProfile,
    ...body,
    email: oauthProfile.email
  });

  return { errors: validateUserData(client), client };
}