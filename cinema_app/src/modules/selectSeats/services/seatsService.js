import { api } from '../../../services/api'

export const getSeatsList = async (screeningId) => 
{
  const { data } = await api.get(`/seats/${screeningId}`);
  return data.data;
};

export const markSeatAsUnavailable = async (screeningId, seatId) =>
{
  const { data } = await api.put(`/seats/${screeningId}/${seatId}/unavailable`);
  return data;
}

export const markSeatAsAvailable = async (screeningId, seatId) =>
{
  const { data } = await api.put(`/seats/${screeningId}/${seatId}/available`);
  return data;
}