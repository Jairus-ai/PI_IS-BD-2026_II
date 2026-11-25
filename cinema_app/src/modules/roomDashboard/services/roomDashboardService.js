import { api } from '../../../services/api';

const SESSION_REQUEST_CONFIG = { withCredentials: true };
const BASE_PATH = '/management/room-dashboard';

export const getRoomDashboardFilters = async () => {
  const { data } = await api.get(`${BASE_PATH}/filters`, SESSION_REQUEST_CONFIG);
  return data.data;
};

export const getRoomDashboard = async ({ roomId, date }) => {
  const { data } = await api.get(`${BASE_PATH}/rooms/${roomId}`, {
    ...SESSION_REQUEST_CONFIG,
    params: date ? { date } : {}
  });
  return data.data;
};

export const setRoomStatus = async ({ roomId, status }) => {
  const { data } = await api.put(`${BASE_PATH}/rooms/${roomId}/status`, { status }, SESSION_REQUEST_CONFIG);
  return data;
};

export const clearRoomStatus = async (roomId) => {
  const { data } = await api.delete(`${BASE_PATH}/rooms/${roomId}/status`, SESSION_REQUEST_CONFIG);
  return data;
};