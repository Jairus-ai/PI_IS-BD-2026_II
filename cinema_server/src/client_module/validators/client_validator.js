import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnSpanishPackage from '@zxcvbn-ts/language-es-es';

const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const MINIMUM_AGE = 18;
const MINIMUM_PASSWORD_SCORE = 3;
const MAX_PASSWORD_BYTES = 72;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 50;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const PHONE_PATTERN = /^\+?\d{8,15}$/;
const BIRTHDATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const IDENTIFICATION_PATTERNS = {
  C: /^\d{9}$/,
  D: /^\d{11,12}$/,
  P: /^[A-Z0-9]{6,20}$/
};
const IDENTIFICATION_MESSAGES = {
  C: 'La cédula debe tener 9 dígitos, sin guiones',
  D: 'El DIMEX debe tener 11 o 12 dígitos',
  P: 'El pasaporte debe tener entre 6 y 20 letras o números'
};

const REQUIRED_FIELDS = [
  'email',
  'password',
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

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isRealCalendarDate(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function isAdult(birthdateText, today = new Date()) {
  const [year, month, day] = birthdateText.split('-').map(Number);
  const adulthoodDate = new Date(year + MINIMUM_AGE, month - 1, day);
  const todayWithoutTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return adulthoodDate <= todayWithoutTime;
}

const NAME_FIELDS = ['firstName', 'middleName', 'firstSurname', 'lastSurname'];

function normalizeClient(body) {
  return {
    email: cleanText(body.email).toLowerCase(),
    firstName: cleanText(body.firstName),
    middleName: cleanText(body.middleName),
    firstSurname: cleanText(body.firstSurname),
    lastSurname: cleanText(body.lastSurname),
    identificationType: cleanText(body.identificationType).toUpperCase(),
    identificationNumber: cleanText(body.identificationNumber).replace(/[\s-]/g, '').toUpperCase(),
    birthdate: cleanText(body.birthdate),
    phoneNumber: cleanText(body.phoneNumber).replace(/[\s-]/g, '')
  };
}

function validateRequiredFields(errors, client, password) {
  for (const fieldName of REQUIRED_FIELDS) {
    const value = fieldName === 'password' ? password : client[fieldName];
    if (!value) {
      errors[fieldName] = REQUIRED_FIELD_MESSAGE;
    }
  }
}

function validateEmail(errors, email) {
  if (!email || errors.email) {
    return;
  }
  if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
    errors.email = 'El correo electrónico no tiene un formato válido';
  }
}

function validateIdentification(errors, { identificationType, identificationNumber }) {
  if (!identificationType) {
    return;
  }
  const pattern = IDENTIFICATION_PATTERNS[identificationType];
  if (!pattern) {
    errors.identificationType = 'El tipo de identificación debe ser C, P o D';
  } else if (identificationNumber && !pattern.test(identificationNumber)) {
    errors.identificationNumber = IDENTIFICATION_MESSAGES[identificationType];
  }
}

function validatePhoneNumber(errors, phoneNumber) {
  if (phoneNumber && !PHONE_PATTERN.test(phoneNumber)) {
    errors.phoneNumber = 'El celular debe tener entre 8 y 15 dígitos';
  }
}

function validateNameLengths(errors, client) {
  for (const fieldName of NAME_FIELDS) {
    if (client[fieldName].length > MAX_NAME_LENGTH) {
      errors[fieldName] = `Máximo ${MAX_NAME_LENGTH} caracteres`;
    }
  }
}

function validateBirthdate(errors, birthdate) {
  if (!birthdate) {
    return;
  }
  if (!BIRTHDATE_PATTERN.test(birthdate) || !isRealCalendarDate(birthdate)) {
    errors.birthdate = 'La fecha de nacimiento no es válida';
  } else if (!isAdult(birthdate)) {
    errors.birthdate = 'Debes ser mayor de edad para registrarte';
  }
}

function validatePassword(errors, password, client) {
  if (!password) {
    return [];
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    errors.password = `La contraseña no puede superar ${MAX_PASSWORD_BYTES} caracteres`;
    return [];
  }
  const userInputs = [client.email, client.firstName, client.firstSurname, client.lastSurname]
    .filter(Boolean);
  const strength = passwordStrengthChecker.check(password, userInputs);
  if (strength.score >= MINIMUM_PASSWORD_SCORE) {
    return [];
  }
  errors.password = 'La contraseña es débil';
  return [strength.feedback.warning, ...strength.feedback.suggestions].filter(Boolean);
}

export function validateClientRegistration(body = {}) {
  const errors = {};
  const client = normalizeClient(body);
  const password = typeof body.password === 'string' ? body.password : '';

  validateRequiredFields(errors, client, password);
  validateEmail(errors, client.email);
  validateIdentification(errors, client);
  validatePhoneNumber(errors, client.phoneNumber);
  validateNameLengths(errors, client);
  validateBirthdate(errors, client.birthdate);
  const passwordSuggestions = validatePassword(errors, password, client);

  return { errors, passwordSuggestions, client, password };
}
