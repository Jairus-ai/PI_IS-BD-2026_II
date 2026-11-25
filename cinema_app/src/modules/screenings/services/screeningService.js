import { api } from '../../../services/api';
import {
  cleanScreeningFilters,
  validatePage,
  validateScreeningId
} from '../validators/screeningValidator';

const SCREENINGS_PATH = '/management/screenings';
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getScreeningsCount = async (filters = {}) => {
  const params = cleanScreeningFilters(filters);

  const { data } = await api.get(`${SCREENINGS_PATH}/count`, {
    ...SESSION_REQUEST_CONFIG,
    params
  });

  return data.total;
};

export const getScreeningsList = async (page = 1, filters = {}) => {
  validatePage(page);

  const params = {
    page,
    ...cleanScreeningFilters(filters)
  };

  const { data } = await api.get(SCREENINGS_PATH, {
    ...SESSION_REQUEST_CONFIG,
    params
  });

  return data;
};

export const getScreening = async (id) => {
  validateScreeningId(id);

  const { data } = await api.get(`${SCREENINGS_PATH}/${id}`, SESSION_REQUEST_CONFIG);

  return data.data;
};
