import oracledb from 'oracledb';

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

const CHECK_DUPLICATE_USER_DATA_SQL = `
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.CLIENTS
        WHERE LOWER(EMAIL) = :email
      )
      OR EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.WORKERS
        WHERE LOWER(EMAIL) = :email
      )
      THEN 1
      ELSE 0
    END AS EMAIL_EXISTS,

    CASE
      WHEN EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.CLIENTS
        WHERE IDENTIFICATION_NUMBER = :identificationNumber
      )
      OR EXISTS (
        SELECT 1
        FROM PI_DEVELOPERS.WORKERS
        WHERE IDENTIFICATION_NUMBER = :identificationNumber
      )
      THEN 1
      ELSE 0
    END AS IDENTIFICATION_EXISTS

  FROM DUAL
`;

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function validateUniqueUserData(
  connection,
  user
) {
  const result = await connection.execute(
    CHECK_DUPLICATE_USER_DATA_SQL,
    {
      email: user.email,
      identificationNumber: user.identificationNumber
    },
    {
      outFormat: oracledb.OUT_FORMAT_OBJECT
    }
  );

  const row = result.rows[0];
  const errors = {};

  if (row.EMAIL_EXISTS === 1) {
    errors.email =
      'Ya existe un usuario con ese correo';
  }

  if (row.IDENTIFICATION_EXISTS === 1) {
    errors.identificationNumber =
      'Ya existe un usuario con esa identificación';
  }

  return errors;
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

function validateRequiredFields(errors, user) {
  for (const fieldName of REQUIRED_USER_FIELDS) {
    if (!user[fieldName]) {
      errors[fieldName] = REQUIRED_FIELD_MESSAGE;
    }
  }
}

function validateEmail(errors, email) {
  if (!email || errors.email) {
    return;
  }

  if (
    email.length > MAX_EMAIL_LENGTH
    || !EMAIL_PATTERN.test(email)
  ) {
    errors.email =
      'El correo electrónico no tiene un formato válido';
  }
}

function validateIdentification(
  errors,
  { identificationType, identificationNumber }
) {
  if (!identificationType) {
    return;
  }

  const pattern =
    IDENTIFICATION_PATTERNS[identificationType];

  if (!pattern) {
    errors.identificationType =
      'El tipo de identificación debe ser C, P o D';
  } else if (
    identificationNumber
    && !pattern.test(identificationNumber)
  ) {
    errors.identificationNumber =
      IDENTIFICATION_MESSAGES[identificationType];
  }
}

function validatePhoneNumber(errors, phoneNumber) {
  if (
    phoneNumber
    && !PHONE_PATTERN.test(phoneNumber)
  ) {
    errors.phoneNumber =
      'El celular debe tener entre 8 y 15 dígitos';
  }
}

function validateNameLengths(errors, user) {
  for (const fieldName of NAME_FIELDS) {
    if (user[fieldName].length > MAX_NAME_LENGTH) {
      errors[fieldName] =
        `Máximo ${MAX_NAME_LENGTH} caracteres`;
    }
  }
}

function validateBirthdate(errors, birthdate) {
  if (!birthdate) {
    return;
  }

  if (
    !BIRTHDATE_PATTERN.test(birthdate)
    || !isRealCalendarDate(birthdate)
  ) {
    errors.birthdate =
      'La fecha de nacimiento no es válida';
  } else if (!isAdult(birthdate)) {
    errors.birthdate =
      'Debes ser mayor de edad para registrarte';
  }
}

export function validateUserData(user) {
  const errors = {};

  validateRequiredFields(errors, user);
  validateEmail(errors, user.email);
  validateIdentification(errors, user);
  validatePhoneNumber(errors, user.phoneNumber);
  validateNameLengths(errors, user);
  validateBirthdate(errors, user.birthdate);

  return errors;
}