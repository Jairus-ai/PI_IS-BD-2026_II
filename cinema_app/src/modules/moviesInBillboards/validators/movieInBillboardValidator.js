const INVALID_PAGE_MESSAGE = 'La página debe ser un número entero mayor a 0.';
const INVALID_ID_MESSAGE = 'La película en cartelera seleccionada no es válida.';
const INVALID_FILTER_MESSAGE = 'El filtro seleccionado no es válido.';

const FILTER_KEYS = [
  'locationId',
  'ratingId'
];

function isEmpty(value) {
  return value === null || value === undefined || value === '';
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

  for (const key of FILTER_KEYS) {
    const value = filters[key];

    if (isEmpty(value))
      continue;

    if (!isPositiveInteger(value))
      throw new Error(INVALID_FILTER_MESSAGE);

    cleanedFilters[key] = Number(value);
  }

  return cleanedFilters;
}
