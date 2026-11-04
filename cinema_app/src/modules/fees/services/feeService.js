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

export const getAudiovisualFormats = async () => {
  const { data } = await api.get('/management/audiovisual_format', SESSION_REQUEST_CONFIG);
  return data.data;
};
