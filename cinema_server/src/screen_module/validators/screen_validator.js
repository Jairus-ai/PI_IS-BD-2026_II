export const SCREEN_TYPES = ['REG', 'VIP', 'IMAX', '4DX'];

export const SCREEN_LIMITS = {
  rows: { min: 1, max: 26 },
  seatsPerRow: { min: 1, max: 30 },
  maintenanceTime: { min: 0, max: 30 },
  addsTime: { min: 0, max: 30 }
};

export const SCREEN_MESSAGES = {
  required: 'Campo obligatorio',
  location: 'Seleccione una sucursal válida',
  type: 'Seleccione un tipo de sala válido',
  rows: 'La cantidad de filas debe estar entre 1 y 26',
  seatsPerRow: 'Los asientos por fila deben estar entre 1 y 30',
  maintenanceTime: 'El tiempo de mantenimiento debe estar entre 0 y 30 minutos',
  addsTime: 'El tiempo de anuncios debe estar entre 0 y 30 minutos'
};

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === '';
}

function toInteger(value) {
  const text = String(value).trim();
  return /^\d+$/.test(text) ? Number(text) : null;
}

function validateRange(value, field) {
  if (isEmpty(value)) {
    return SCREEN_MESSAGES.required;
  }
  const number = toInteger(value);
  const { min, max } = SCREEN_LIMITS[field];
  return number !== null && number >= min && number <= max ? null : SCREEN_MESSAGES[field];
}

function validateLocationId(locationId) {
  if (isEmpty(locationId)) {
    return SCREEN_MESSAGES.required;
  }
  const number = toInteger(locationId);
  return number !== null && number > 0 ? null : SCREEN_MESSAGES.location;
}

function validateType(type) {
  if (isEmpty(type)) {
    return SCREEN_MESSAGES.required;
  }
  return SCREEN_TYPES.includes(type) ? null : SCREEN_MESSAGES.type;
}

export function validateScreen(body = {}) {
  const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : body.type;
  const errors = {};

  const locationError = validateLocationId(body.locationId);
  if (locationError) errors.locationId = locationError;

  const typeError = validateType(type);
  if (typeError) errors.type = typeError;

  for (const field of ['rows', 'seatsPerRow', 'maintenanceTime', 'addsTime']) {
    const fieldError = validateRange(body[field], field);
    if (fieldError) errors[field] = fieldError;
  }

  if (Object.keys(errors).length > 0) {
    return { errors, screen: null };
  }

  return {
    errors,
    screen: {
      locationId: toInteger(body.locationId),
      type,
      rows: toInteger(body.rows),
      seatsPerRow: toInteger(body.seatsPerRow),
      maintenanceTime: toInteger(body.maintenanceTime),
      addsTime: toInteger(body.addsTime)
    }
  };
}
