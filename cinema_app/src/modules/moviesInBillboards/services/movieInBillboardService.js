import { api } from '../../../services/api';
import {
  cleanMovieInBillboardFilters,
  validateMovieInBillboardId,
  validateNewMovieInBillboard,
  validatePage
} from '../validators/movieInBillboardValidator';

const MOVIES_IN_BILLBOARDS_PATH = '/management/movies_in_billboards';
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getMoviesInBillboardsCount = async (filters = {}) => {
  const params = cleanMovieInBillboardFilters(filters);

  const { data } = await api.get(`${MOVIES_IN_BILLBOARDS_PATH}/count`, {
    ...SESSION_REQUEST_CONFIG,
    params
  });

  return data.total;
};

export const getMoviesInBillboardsList = async (page = 1, filters = {}) => {
  validatePage(page);

  const params = {
    page,
    ...cleanMovieInBillboardFilters(filters)
  };

  const { data } = await api.get(MOVIES_IN_BILLBOARDS_PATH, {
    ...SESSION_REQUEST_CONFIG,
    params
  });

  return data;
};

export const getMovieInBillboard = async (id) => {
  validateMovieInBillboardId(id);

  const { data } = await api.get(`${MOVIES_IN_BILLBOARDS_PATH}/${id}`, SESSION_REQUEST_CONFIG);

  return data.data;
};

export const createMovieInBillboard = async (movieInBillboard) => {
  const body = validateNewMovieInBillboard(movieInBillboard);

  const { data } = await api.post(MOVIES_IN_BILLBOARDS_PATH, body, SESSION_REQUEST_CONFIG);

  return data.data;
};
