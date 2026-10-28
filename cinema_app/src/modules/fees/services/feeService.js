import { api } from '../../../services/api';

//fee routes requires the session cookie
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getFees = async () => {
  const { data } = await api.get('/management/fees', SESSION_REQUEST_CONFIG);
  return data.data;
};
