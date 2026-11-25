import { api } from '../../../services/api';

//profile routes require session cookie
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getProfile = async () => {
  const { data } = await api.get('/profile', SESSION_REQUEST_CONFIG);
  return data.data;
};

export const updateProfile = async (changes) => {
  const { data } = await api.put('/profile', changes, SESSION_REQUEST_CONFIG);
  return data.data;
};
