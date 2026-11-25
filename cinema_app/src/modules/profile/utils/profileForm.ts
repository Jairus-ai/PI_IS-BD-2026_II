import type { Profile } from '../types/profile';

export interface ProfileFormValues {
  firstName: string;
  middleName: string;
  firstSurname: string;
  lastSurname: string;
  phoneNumber: string;
}

export type ProfileField = keyof ProfileFormValues;
export type ProfileFormErrors = Partial<Record<ProfileField, string>>;

export interface ProfileChange {
  field: ProfileField;
  label: string;
  previous: string;
  current: string;
}

export const FIELD_LABELS: Record<ProfileField, string> = {
  firstName: 'Nombre',
  middleName: 'Segundo nombre',
  firstSurname: 'Primer apellido',
  lastSurname: 'Segundo apellido',
  phoneNumber: 'Celular'
};

export const PROFILE_FIELDS = Object.keys(FIELD_LABELS) as ProfileField[];

const REQUIRED_FIELDS: ProfileField[] = ['firstName', 'firstSurname', 'phoneNumber'];
const NAME_FIELDS: ProfileField[] = ['firstName', 'middleName', 'firstSurname', 'lastSurname'];
const MAX_NAME_LENGTH = 50;
const NAME_PATTERN = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+(?: [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const PHONE_PATTERN = /^\d{8}$/;
export const REQUIRED_MESSAGE = 'Campo obligatorio';
export const NAME_MESSAGE = 'Solo se permiten letras y espacios';
export const PHONE_MESSAGE = 'El celular debe tener 8 dígitos';
const NAME_LENGTH_MESSAGE = 'No puede exceder 50 caracteres';

export function toFormValues(profile: Profile): ProfileFormValues {
  return {
    firstName: profile.firstName,
    middleName: profile.middleName ?? '',
    firstSurname: profile.firstSurname,
    lastSurname: profile.lastSurname ?? '',
    phoneNumber: profile.phoneNumber
  };
}

export function cleanValue(value: string): string {
  return value.trim().replaceAll(/\s+/g, ' ');
}

export function cleanFormValues(values: ProfileFormValues): ProfileFormValues {
  return {
    firstName: cleanValue(values.firstName),
    middleName: cleanValue(values.middleName),
    firstSurname: cleanValue(values.firstSurname),
    lastSurname: cleanValue(values.lastSurname),
    phoneNumber: values.phoneNumber.replaceAll(/[\s-]/g, '')
  };
}
export function validateProfileForm(values: ProfileFormValues, original: ProfileFormValues): ProfileFormErrors {
  const cleaned = cleanFormValues(values);
  const errors: ProfileFormErrors = {};

  for (const field of NAME_FIELDS) {
    const value = cleaned[field];
    if (!value) {
      if (REQUIRED_FIELDS.includes(field)) {
        errors[field] = REQUIRED_MESSAGE;
      }
    } else if (!NAME_PATTERN.test(value)) {
      errors[field] = NAME_MESSAGE;
    } else if (value.length > MAX_NAME_LENGTH) {
      errors[field] = NAME_LENGTH_MESSAGE;
    }
  }

  if (!cleaned.phoneNumber) {
    errors.phoneNumber = REQUIRED_MESSAGE;
  } else if (cleaned.phoneNumber !== original.phoneNumber && !PHONE_PATTERN.test(cleaned.phoneNumber)) {
    errors.phoneNumber = PHONE_MESSAGE;
  }
  return errors;
}

export function getProfileChanges(values: ProfileFormValues, original: ProfileFormValues): ProfileChange[] {
  const cleaned = cleanFormValues(values);
  return PROFILE_FIELDS
    .filter((field) => cleaned[field] !== original[field])
    .map((field) => ({
      field,
      label: FIELD_LABELS[field],
      previous: original[field],
      current: cleaned[field]
    }));
}
