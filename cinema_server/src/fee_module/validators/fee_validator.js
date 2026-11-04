export const FEE_TYPES = ['G', 'N', 'E', 'M'];

const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';
const INVALID_TYPE_MESSAGE = 'Seleccione un tipo de tarifa válido';
const INVALID_FORMAT_MESSAGE = 'Seleccione un formato audiovisual válido';
const INVALID_AMOUNT_MESSAGE = 'El monto debe ser un número mayor a cero';
const AMOUNT_TOO_LARGE_MESSAGE = 'El monto no puede ser mayor a ₡99 999 999,99';
const AMOUNT_DECIMALS_MESSAGE = 'El monto puede tener como máximo 2 decimales';

//fees.amount is number(10, 2)
const MAX_AMOUNT = 99999999.99;
const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function validateType(type) {
  if (isEmpty(type)) {
    return REQUIRED_FIELD_MESSAGE;
  }
  return FEE_TYPES.includes(type) ? null : INVALID_TYPE_MESSAGE;
}

function validateFormatId(formatId) {
  if (isEmpty(formatId)) {
    return REQUIRED_FIELD_MESSAGE;
  }
  return Number.isInteger(Number(formatId)) && Number(formatId) > 0 ? null : INVALID_FORMAT_MESSAGE;
}

function validateAmount(amount) {
  if (isEmpty(amount)) {
    return REQUIRED_FIELD_MESSAGE;
  }
  const amountText = String(amount).trim();
  const amountValue = Number(amountText);
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return INVALID_AMOUNT_MESSAGE;
  }
  if (!AMOUNT_PATTERN.test(amountText)) {
    return AMOUNT_DECIMALS_MESSAGE;
  }
  return amountValue > MAX_AMOUNT ? AMOUNT_TOO_LARGE_MESSAGE : null;
}

export function validateFee(body = {}) {
  const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : body.type;
  const errors = {};

  const typeError = validateType(type);
  if (typeError) errors.type = typeError;

  const formatError = validateFormatId(body.formatId);
  if (formatError) errors.formatId = formatError;

  const amountError = validateAmount(body.amount);
  if (amountError) errors.amount = amountError;

  return {
    errors,
    fee: { type, formatId: Number(body.formatId), amount: Number(body.amount) }
  };
}
