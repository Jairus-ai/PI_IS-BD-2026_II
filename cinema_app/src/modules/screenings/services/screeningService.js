import { api } from '../../../services/api';

export const getScreeningsByMovie = async (idMovie, idLocation) => {
  const { data } = await api.get(`/screenings/movie/${idMovie}`, {
    params: idLocation ? { idLocation } : undefined,
  });
  return data;
};