import { api } from '../../../services/api';

export const registerClient = async (client) => {
  const { data } = await api.post('/clients/register', client, { withCredentials: true });
  return data;
};
