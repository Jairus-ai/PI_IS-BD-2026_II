import { api } from '../../../services/api';

const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getPurchaseSummary = async () => {
  const { data } = await api.get('/payments/summary', SESSION_REQUEST_CONFIG);

  return data.data;
};

//the server reads the reservation from its cookie and calculates every amount
export const createPaymentIntent = async () => {
  const { data } = await api.post('/payments/intent', {}, SESSION_REQUEST_CONFIG);

  return data.data;
};

export const getPaymentStatus = async (sessionId) => {
  const { data } = await api.get('/payments/status', {
    ...SESSION_REQUEST_CONFIG,
    params: { session_id: sessionId }
  });

  return data.data;
};
