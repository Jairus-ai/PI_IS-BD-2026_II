import { api } from '../../../services/api';

const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getScreens = async () => {
  const { data } = await api.get('/management/screens', SESSION_REQUEST_CONFIG);
  return data.data;
};

export const getScreenLocations = async () => {
  const { data } = await api.get('/management/screens/locations', SESSION_REQUEST_CONFIG);
  return data.data;
};

export const addScreen = async (screen) => {
  const { data } = await api.post('/management/screens', screen, SESSION_REQUEST_CONFIG);
  return data.data;
};
