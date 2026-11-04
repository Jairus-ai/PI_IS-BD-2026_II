import { api } from '../../../services/api';

//fee routes requires session cookie
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getFees = async () => {
  const { data } = await api.get('/management/fees', SESSION_REQUEST_CONFIG);
  return data.data;
};

export const addFee = async (fee) => {
  const { data } = await api.post('/management/fees', fee, SESSION_REQUEST_CONFIG);
  return data.data;
};

export const updateFee = async ({ id, fee }) => {
  const { data } = await api.put(`/management/fees/${id}`, fee, SESSION_REQUEST_CONFIG);
  return data.data;
};

export const deactivateFee = async (id) => {
  const { data } = await api.patch(`/management/fees/${id}/deactivate`, {}, SESSION_REQUEST_CONFIG);
  return data;
};

export const getAudiovisualFormats = async () => {
  const { data } = await api.get('/management/audiovisual_format', SESSION_REQUEST_CONFIG);
  return data.data;
};
