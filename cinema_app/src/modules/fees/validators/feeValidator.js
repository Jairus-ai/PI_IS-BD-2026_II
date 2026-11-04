export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const INVALID_AMOUNT_MESSAGE = 'El monto debe ser un número mayor a cero';
const AMOUNT_DECIMALS_MESSAGE = 'El monto puede tener como máximo 2 decimales';
const AMOUNT_TOO_LARGE_MESSAGE = 'El monto no puede ser mayor a ₡99 999 999,99';

const MAX_AMOUNT = 99999999.99;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

export function validateAmount(amount) {
  if (isEmpty(amount)) {
    return REQUIRED_FIELD_MESSAGE;
  }
  //accepts a comma as decimal separator (4500,50)
  const amountText = String(amount).trim().replace(',', '.');
  const amountValue = Number(amountText);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return INVALID_AMOUNT_MESSAGE;
  }
  if (!AMOUNT_PATTERN.test(amountText)) {
    return AMOUNT_DECIMALS_MESSAGE;
  }
  return amountValue > MAX_AMOUNT ? AMOUNT_TOO_LARGE_MESSAGE : undefined;
}

export function validateFeeForm(values) {
  const errors = {};
  if (isEmpty(values.type)) errors.type = REQUIRED_FIELD_MESSAGE;
  if (isEmpty(values.formatId)) errors.formatId = REQUIRED_FIELD_MESSAGE;
  const amountError = validateAmount(values.amount);
  if (amountError) errors.amount = amountError;
  return errors;
}

export function normalizeAmount(amount) {
  return String(amount).trim().replace(',', '.');
}
