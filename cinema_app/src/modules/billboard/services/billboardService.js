import { api } from '../../../services/api';

export const getBillboardMovies = async () => {
  const { data } = await api.get('/billboard/movies');
  return data.data;
};

export const getNowShowingMovies = async () => {
  const { data } = await api.get('/billboard/now-showing');
  return data.data;
};
