export const REQUIRED_FIELD_MESSAGE = 'Campo obligatorio';

export const SCREEN_LIMITS = {
  rows: { min: 1, max: 26 },
  seatsPerRow: { min: 1, max: 30 },
  maintenanceTime: { min: 0, max: 30 },
  addsTime: { min: 0, max: 30 }
};

const RANGE_MESSAGES = {
  rows: 'La cantidad de filas debe estar entre 1 y 26',
  seatsPerRow: 'Los asientos por fila deben estar entre 1 y 30',
  maintenanceTime: 'El tiempo de mantenimiento debe estar entre 0 y 30 minutos',
  addsTime: 'El tiempo de anuncios debe estar entre 0 y 30 minutos'
};

function isEmpty(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function toInteger(value) {
  const text = String(value).trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

export function validateRangeField(field, value) {
  if (isEmpty(value)) {
    return REQUIRED_FIELD_MESSAGE;
  }
  const number = toInteger(value);
  const { min, max } = SCREEN_LIMITS[field];
  return number !== null && number >= min && number <= max ? undefined : RANGE_MESSAGES[field];
}

export function getCapacity(rows, seatsPerRow) {
  if (validateRangeField('rows', rows) || validateRangeField('seatsPerRow', seatsPerRow)) {
    return null;
  }
  return toInteger(rows) * toInteger(seatsPerRow);
}

export function validateScreenForm(values) {
  const errors = {};
  if (isEmpty(values.locationId)) errors.locationId = REQUIRED_FIELD_MESSAGE;
  if (isEmpty(values.type)) errors.type = REQUIRED_FIELD_MESSAGE;
  for (const field of Object.keys(SCREEN_LIMITS)) {
    const fieldError = validateRangeField(field, values[field]);
    if (fieldError) errors[field] = fieldError;
  }
  return errors;
}

export function buildScreenPayload(values) {
  return {
    locationId: Number(values.locationId),
    type: values.type,
    rows: Number(values.rows),
    seatsPerRow: Number(values.seatsPerRow),
    maintenanceTime: Number(values.maintenanceTime),
    addsTime: Number(values.addsTime)
  };
}
