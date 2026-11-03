const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const MINIMUM_AGE = 18;
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

const NAME_FIELDS = [
  'firstName',
  'middleName',
  'firstSurname',
  'lastSurname'
];

const REQUIRED_USER_FIELDS = [
  'email',
  'firstName',
  'firstSurname',
  'identificationType',
  'identificationNumber',
  'birthdate',
  'phoneNumber'
];

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeUserData(body = {}) {
  return {
    email: cleanText(body.email).toLowerCase(),
    firstName: cleanText(body.firstName),
    middleName: cleanText(body.middleName),
    firstSurname: cleanText(body.firstSurname),
    lastSurname: cleanText(body.lastSurname),
    identificationType: cleanText(body.identificationType).toUpperCase(),
    identificationNumber: cleanText(body.identificationNumber)
      .replace(/[\s-]/g, '')
      .toUpperCase(),
    birthdate: cleanText(body.birthdate),
    phoneNumber: cleanText(body.phoneNumber).replace(/[\s-]/g, '')
  };
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

  const todayWithoutTime = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return adulthoodDate <= todayWithoutTime;
}

export function validateUserData(user) {
  const errors = {};

  for (const fieldName of REQUIRED_USER_FIELDS) {
    if (!user[fieldName]) {
      errors[fieldName] = REQUIRED_FIELD_MESSAGE;
    }
  }

  if (
    user.email
    && (
      user.email.length > MAX_EMAIL_LENGTH
      || !EMAIL_PATTERN.test(user.email)
    )
  ) {
    errors.email = 'El correo electrónico no tiene un formato válido';
  }

  if (user.identificationType) {
    const pattern = IDENTIFICATION_PATTERNS[user.identificationType];

    if (!pattern) {
      errors.identificationType =
        'El tipo de identificación debe ser C, P o D';
    } else if (
      user.identificationNumber
      && !pattern.test(user.identificationNumber)
    ) {
      errors.identificationNumber =
        IDENTIFICATION_MESSAGES[user.identificationType];
    }
  }

  if (
    user.phoneNumber
    && !PHONE_PATTERN.test(user.phoneNumber)
  ) {
    errors.phoneNumber =
      'El celular debe tener entre 8 y 15 dígitos';
  }

  for (const fieldName of NAME_FIELDS) {
    if (user[fieldName].length > MAX_NAME_LENGTH) {
      errors[fieldName] =
        `Máximo ${MAX_NAME_LENGTH} caracteres`;
    }
  }

  if (user.birthdate) {
    if (
      !BIRTHDATE_PATTERN.test(user.birthdate)
      || !isRealCalendarDate(user.birthdate)
    ) {
      errors.birthdate =
        'La fecha de nacimiento no es válida';
    } else if (!isAdult(user.birthdate)) {
      errors.birthdate =
        'Debes ser mayor de edad para registrarte';
    }
  }

  return errors;
}