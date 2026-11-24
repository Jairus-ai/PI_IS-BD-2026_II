import { normalizeUserData, validateUserData } from '../../shared/validators/user_data_validator.js';

export function validateGoogleSignUp(googleProfile, body = {}) {
  const client = normalizeUserData({
    ...googleProfile,
    ...body,
    email: googleProfile.email
  });

  return { errors: validateUserData(client), client };
}