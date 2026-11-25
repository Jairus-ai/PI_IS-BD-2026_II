import { api } from '../../../services/api'

const RESERVATION_REQUEST_CONFIG = { withCredentials: true };

export const getSeatsList = async (screeningId) =>
{
  const { data } = await api.get(`/seats/${screeningId}`, RESERVATION_REQUEST_CONFIG);

  return data;
};

export const getcreeningRoomInfo = async (screeningId) =>
{
  const { data } = await api.get(`/seats/${screeningId}/screen`, RESERVATION_REQUEST_CONFIG);

  return data;
};

export const reserveSeat = async (screeningId, seatId) =>
{
  const { data } = await api.post(`/seats/${screeningId}/reservation/${seatId}`, {}, RESERVATION_REQUEST_CONFIG);

  return data.data;
}

export const releaseSeat = async (screeningId, seatId) =>
{
  const { data } = await api.delete(`/seats/${screeningId}/reservation/${seatId}`, RESERVATION_REQUEST_CONFIG);

  return data.data;
}

export const cancelReservation = async (screeningId) =>
{
  const { data } = await api.delete(`/seats/${screeningId}/reservation`, RESERVATION_REQUEST_CONFIG);

  return data;
}
