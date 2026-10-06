import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnSpanishPackage from '@zxcvbn-ts/language-es-es';

export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
export const MINIMUM_PASSWORD_SCORE = 3;

const MINIMUM_AGE = 18;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const REQUIRED_FIELDS = [
  'email',
  'password',
  'confirmPassword',
  'firstName',
  'firstSurname',
  'identificationType',
  'identificationNumber',
  'birthdate',
  'phoneNumber'
];

const passwordStrengthChecker = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnSpanishPackage.dictionary
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnSpanishPackage.translations
});

export function checkPasswordStrength(password, values = {}) {
  if (!password) {
    return { score: 0, suggestions: [] };
  }
  const userInputs = [values.email, values.firstName, values.firstSurname, values.lastSurname]
    .filter(Boolean);
  const result = passwordStrengthChecker.check(password, userInputs);
  return {
    score: result.score,
    suggestions: [result.feedback.warning, ...result.feedback.suggestions].filter(Boolean)
  };
}

function isAdult(birthdateText) {
  const [year, month, day] = birthdateText.split('-').map(Number);
  const adulthoodDate = new Date(year + MINIMUM_AGE, month - 1, day);
  const today = new Date();
  return adulthoodDate <= new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function validateClientForm(values) {
  const errors = {};

  for (const fieldName of REQUIRED_FIELDS) {
    if (!String(values[fieldName] ?? '').trim()) {
      errors[fieldName] = REQUIRED_FIELD_MESSAGE;
    }
  }

  if (!errors.email && !EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = 'El correo electrónico no tiene un formato válido';
  }

  if (!errors.birthdate && !isAdult(values.birthdate)) {
    errors.birthdate = 'Debes ser mayor de edad para registrarte';
  }

  if (!errors.password && checkPasswordStrength(values.password, values).score < MINIMUM_PASSWORD_SCORE) {
    errors.password = 'La contraseña es débil';
  }

  if (!errors.confirmPassword && values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Las contraseñas no coinciden';
  }

  return errors;
}
