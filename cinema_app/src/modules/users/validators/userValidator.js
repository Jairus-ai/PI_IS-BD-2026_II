import {
  validateRequiredUserField,
  validateUserData,
} from '../../../shared/validators/userDataValidator';

export function validateRequiredField(fieldName, value) {
  return validateRequiredUserField(fieldName, value);
}

export function validateUserForm(values) {
  const errors = validateUserData(values);

  if (
    (values.role === 'EMPLOYEE' ||
      values.role === 'ADMINISTRATOR') &&
    (!Array.isArray(values.locations) ||
      values.locations.length === 0)
    ) {
    errors.locations =
      'Debes seleccionar al menos una sucursal';
  }

  return errors;
}