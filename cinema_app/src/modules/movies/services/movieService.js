import { api } from '../../../services/api'

export const getMovies = async () => {
  const { data } = await api.get('/movies');
  return data;
};

export const getMovieById = async (id) => {
  const { data } = await api.get(`/movies/${id}`);
  return data;
};

export const getGenres = async () => {
  const { data } = await api.get('/genres');
  return data;
};

export const getRatings = async () => {
  const { data } = await api.get('/ratings');
  return data;
};

export const getLanguages = async () => {
  const { data } = await api.get('/languages');
  return data;
};

export const getAudiovisualFormats = async () => {
  const { data } = await api.get('/audiovisual-formats');
  return data;
};