export const MANUAL_STATUSES = ['PLAYING', 'WAITING', 'CLEANING', 'FREE'];

const INVALID_DATE_MESSAGE = 'La fecha debe tener el formato AAAA-MM-DD';
const INVALID_STATUS_MESSAGE = 'Seleccione un estado válido';
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseRoomId(value) {
  const roomId = Number(value);
  return Number.isInteger(roomId) && roomId > 0 ? roomId : null;
}

function isRealDate(text) {
  if (!DATE_PATTERN.test(text)) {
    return false;
  }
  const [year, month, day] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateDashboardQuery(query = {}) {
  const rawDate = query.date;
  if (rawDate === undefined || rawDate === '') {
    return { errors: {}, date: null };
  }

  const date = typeof rawDate === 'string' ? rawDate.trim() : '';
  return isRealDate(date)
    ? { errors: {}, date }
    : { errors: { date: INVALID_DATE_MESSAGE }, date: null };
}

export function validateManualStatus(body = {}) {
  const status = typeof body.status === 'string' ? body.status.trim().toUpperCase() : body.status;
  const errors = {};

  if (!MANUAL_STATUSES.includes(status)) {
    errors.status = INVALID_STATUS_MESSAGE;
  }

  return { errors, status };
}