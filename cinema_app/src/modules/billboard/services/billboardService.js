import { api } from '../../../services/api';

export const getBillboardMovies = async () => {
  const { data } = await api.get('/billboard/movies');
  return data.data;
};
