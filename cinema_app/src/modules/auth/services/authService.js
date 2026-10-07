import { api } from '../../../services/api';

const WITH_SESSION_COOKIE = { withCredentials: true };

export const logIn = async (credentials) => {
  const { data } = await api.post('/auth/login', credentials, WITH_SESSION_COOKIE);
  return data;
};

export const logOut = async () => {
  const { data } = await api.post('/auth/logout', {}, WITH_SESSION_COOKIE);
  return data;
};

export const getCurrentUser = async () => {
  const { data } = await api.get('/auth/me', WITH_SESSION_COOKIE);
  return data;
};
