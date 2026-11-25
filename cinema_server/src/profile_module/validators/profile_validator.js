const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const NAME_MESSAGE = 'Solo se permiten letras y espacios';
const NAME_LENGTH_MESSAGE = 'No puede exceder 50 caracteres';
const PHONE_MESSAGE = 'El celular debe tener 8 dígitos';
const MAX_NAME_LENGTH = 50;

//letters with accents and ñ, single spaces between words
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const PHONE_PATTERN = /^\d{8}$/;

const REQUIRED_NAME_FIELDS = ['firstName', 'firstSurname'];
const OPTIONAL_NAME_FIELDS = ['middleName', 'lastSurname'];

function cleanText(value) {
  return typeof value === 'string' ? value.trim().replaceAll(/\s+/g, ' ') : '';
}

//only the editable fields 
export function normalizeProfileData(body = {}) {
  return {
    firstName: cleanText(body.firstName),
    middleName: cleanText(body.middleName),
    firstSurname: cleanText(body.firstSurname),
    lastSurname: cleanText(body.lastSurname),
    phoneNumber: cleanText(body.phoneNumber).replaceAll(/[\s-]/g, '')
  };
}

function validateName(errors, field, value, required) {
  if (!value) {
    if (required) {
      errors[field] = REQUIRED_FIELD_MESSAGE;
    }
    return;
  }
  if (!NAME_PATTERN.test(value)) {
    errors[field] = NAME_MESSAGE;
  } else if (value.length > MAX_NAME_LENGTH) {
    errors[field] = NAME_LENGTH_MESSAGE;
  }
}

export function validateProfileData(profile, currentPhoneNumber = null) {
  const errors = {};
  for (const field of REQUIRED_NAME_FIELDS) {
    validateName(errors, field, profile[field], true);
  }
  for (const field of OPTIONAL_NAME_FIELDS) {
    validateName(errors, field, profile[field], false);
  }

  if (!profile.phoneNumber) {
    errors.phoneNumber = REQUIRED_FIELD_MESSAGE;
  } else if (profile.phoneNumber !== currentPhoneNumber && !PHONE_PATTERN.test(profile.phoneNumber)) {
    errors.phoneNumber = PHONE_MESSAGE;
  }
  return errors;
}
