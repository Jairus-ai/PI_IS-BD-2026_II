import { api } from '../../../services/api';

//purchase routes requires the session cookie
const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getPurchaseHistory = async () => {
  const { data } = await api.get('/purchases', SESSION_REQUEST_CONFIG);
  return data.data;
};

export const getPurchaseDetail = async (purchaseId) => {
  const { data } = await api.get(`/purchases/${purchaseId}`, SESSION_REQUEST_CONFIG);
  return data.data;
};
