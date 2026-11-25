const INVALID_PAGE_MESSAGE = 'La página debe ser un número entero mayor a 0.';
const INVALID_ID_MESSAGE = 'La película en cartelera seleccionada no es válida.';
const INVALID_FILTER_MESSAGE = 'El filtro seleccionado no es válido.';
const MOVIE_NAME_TOO_LONG_MESSAGE = 'El nombre de la película no puede exceder los 100 caracteres.';

const MAX_MOVIE_NAME_LENGTH = 100;

const ID_FILTER_KEYS = [
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
