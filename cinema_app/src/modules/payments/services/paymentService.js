import { api } from '../../../services/api';

const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getPaymentReservation = async () => {
  const { data } = await api.get('/payments/reservation', SESSION_REQUEST_CONFIG);

  return data.data;
};

export const createPaymentIntent = async (payment) => {
  const { data } = await api.post('/payments/intent', payment, SESSION_REQUEST_CONFIG);

  return data.data;
};

export const getPaymentStatus = async (sessionId) => {
  const { data } = await api.get('/payments/status', {
    ...SESSION_REQUEST_CONFIG,
    params: { session_id: sessionId }
  });

  return data.data;
};
