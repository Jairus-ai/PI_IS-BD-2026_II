import { validatePasswordStrength } from '../../shared/validators/password_validator.js';

import { normalizeUserData, validateUserData} from '../../shared/validators/user_data_validator.js';

export { isAdult, normalizeUserData, validateUserData} from '../../shared/validators/user_data_validator.js';

const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';

function validatePassword(errors, password, client) {
  if (!password) {
    return [];
  }

  const userInputs = [
    client.email,
    client.firstName,
    client.firstSurname,
    client.lastSurname
  ];

  const { error, suggestions } = validatePasswordStrength(
    password,
    userInputs
  );

  if (error) {
    errors.password = error;
  }

  return suggestions;
}

export function validateClientRegistration(body = {}) {
  const client = normalizeUserData(body);
  const errors = validateUserData(client);

  const password =
    typeof body.password === 'string'
      ? body.password
      : '';

  if (!password) {
    errors.password = REQUIRED_FIELD_MESSAGE;
  }

  const passwordSuggestions = validatePassword(
    errors,
    password,
    client
  );

  return {
    errors,
    passwordSuggestions,
    client,
    password
  };
}