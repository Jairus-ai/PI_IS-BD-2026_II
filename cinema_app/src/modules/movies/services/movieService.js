import { api } from '../../../services/api'

export const getMovies = async (page = 1) => {
  const { data } = await api.get('/management/movies', { params: { page } });
  return data;
};

export const getMoviesCount = async () => {
  const { data } = await api.get('/management/movies/count');
  return data;
};

export const getMovieById = async (id) => {
  const { data } = await api.get(`/management/movies/${id}`);
  return data;
};

export const getGenres = async () => {
  const { data } = await api.get('/management/genres');
  return data;
};

export const getRatings = async () => {
  const { data } = await api.get('/management/ratings');
  return data;
};

export const getLanguages = async () => {
  const { data } = await api.get('/management/languages');
  return data;
};

export const getAudiovisualFormats = async () => {
  const { data } = await api.get('/management/audiovisual_format');
  return data;
};