import { api } from '../../../services/api'

export const generateAndSendQR = async (idUser, QRJason) =>
{
  const {data} = await api.post(`purchase/qr/${encodeURIComponent(idUser)}`, QRJason);
  return data;
};

export const getTicketInfo = async(screeningId, seatId) =>
{
  const {data} = await api.get(`purchase/${encodeURIComponent(screeningId)}/${encodeURIComponent(seatId)}`);
  return data;
}