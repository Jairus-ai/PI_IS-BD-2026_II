import { api } from '../../../services/api'

const SESSION_REQUEST_CONFIG = { withCredentials: true };

export const getMovies = async (page = 1, filters = {}) => {
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([_,value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const { data } = await api.get('/management/movies', {
      params: {
        page,
        ...cleanedFilters,
    },
  });
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

export const getMovieOptions = async () => {
  const { data } = await api.get('/management/movies/options');
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

export const getDirectors = async () => {
  const { data } = await api.get('/management/directors');
  return data;
};

export const uploadPoster = async (file) => {
  const formData = new FormData();
  formData.append('poster', file);
  const { data } = await api.post('/management/movies/poster', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...SESSION_REQUEST_CONFIG,
  });
  return data;
};

export const createMovie = async (movie) => {
  const { data } = await api.post('/management/movies', movie, SESSION_REQUEST_CONFIG);
  return data;
};

export const updateMovie = async (id, movie) => {
  const { data } = await api.put(`/management/movies/${id}`, movie, SESSION_REQUEST_CONFIG);
  return data;
};

export const deleteMovie = async (id) => {
  const { data } = await api.delete(`/management/movies/${id}`, SESSION_REQUEST_CONFIG);
  return data;
};