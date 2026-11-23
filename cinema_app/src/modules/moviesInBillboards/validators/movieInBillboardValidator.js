const INVALID_PAGE_MESSAGE = 'La página debe ser un número entero mayor a 0.';
const INVALID_ID_MESSAGE = 'La película en cartelera seleccionada no es válida.';
const INVALID_FILTER_MESSAGE = 'El filtro seleccionado no es válido.';
const MOVIE_NAME_TOO_LONG_MESSAGE = 'El nombre de la película no puede exceder los 100 caracteres.';
const INVALID_MOVIE_MESSAGE = 'Debe seleccionar una película válida.';
const INVALID_LOCATION_MESSAGE = 'Debe seleccionar una sucursal válida.';
const INVALID_OPENING_DATE_MESSAGE = 'La fecha de inicio debe ser una fecha válida.';
const INVALID_CLOSING_DATE_MESSAGE = 'La fecha de fin debe ser una fecha válida.';
const CLOSING_BEFORE_OPENING_MESSAGE = 'La fecha de fin no puede ser anterior a la fecha de inicio.';
const INVALID_PREMIER_MESSAGE = 'El estreno debe ser verdadero o falso.';

const MAX_MOVIE_NAME_LENGTH = 100;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ID_FILTER_KEYS = [
  'locationId',
  'ratingId'
];

function isEmpty(value) {
  return value === null || value === undefined || value === '';
}

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value))
    return false;

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

export function validatePage(page) {
  if (!isPositiveInteger(page))
    throw new Error(INVALID_PAGE_MESSAGE);
}

export function validateMovieInBillboardId(id) {
  if (!isPositiveInteger(id))
    throw new Error(INVALID_ID_MESSAGE);
}

export function cleanMovieInBillboardFilters(filters = {}) {
  const cleanedFilters = {};

  for (const key of ID_FILTER_KEYS) {
    const value = filters[key];

    if (isEmpty(value))
      continue;

    if (!isPositiveInteger(value))
      throw new Error(INVALID_FILTER_MESSAGE);

    cleanedFilters[key] = Number(value);
  }

  const movieName = String(filters.movieName ?? '').trim();

  if (movieName.length > MAX_MOVIE_NAME_LENGTH)
    throw new Error(MOVIE_NAME_TOO_LONG_MESSAGE);

  if (movieName !== '')
    cleanedFilters.movieName = movieName;

  return cleanedFilters;
}

export function validateNewMovieInBillboard(movieInBillboard = {}) {
  const {
    movieId,
    locationId,
    openingDate,
    closingDate,
    premier = false
  } = movieInBillboard;

  if (!isPositiveInteger(movieId))
    throw new Error(INVALID_MOVIE_MESSAGE);

  if (!isPositiveInteger(locationId))
    throw new Error(INVALID_LOCATION_MESSAGE);

  if (!isValidDate(openingDate))
    throw new Error(INVALID_OPENING_DATE_MESSAGE);

  if (!isValidDate(closingDate))
    throw new Error(INVALID_CLOSING_DATE_MESSAGE);

  if (closingDate < openingDate)
    throw new Error(CLOSING_BEFORE_OPENING_MESSAGE);

  if (typeof premier !== 'boolean')
    throw new Error(INVALID_PREMIER_MESSAGE);

  return {
    movieId: Number(movieId),
    locationId: Number(locationId),
    openingDate,
    closingDate,
    premier
  };
}
