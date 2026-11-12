import { api } from '../../../services/api'

export const getLocations = async (page = 1, filters = {}) => {
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([_,value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const { data } = await api.get('/management/locations/l/', {
      params: {
        page,
        ...cleanedFilters,
    },
  });
  return data;
};

export const getLocationById = async (id) => {
  const { data } = await api.get(`/management/locations/${id}`);
  return data;
};

export const getCantons = async (provinceId) => {
    const { data } = await api.get('/management/locations/c', {
        params: { provinceId },
    });
    return data;
};

export const getProvinces = async () => {
  const {data} = await api.get('/management/locations/p');
  return data;
};

export const getLocationsCount = async (filters = {}) => {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    const { data } = await api.get('/management/locations/count', { params: cleanedFilters });
    return data;
};

export const createLocation = async (location) => {
  const { data } = await api.post('/management/locations', location);
  return data;
};

export const updateLocation = async (id, location) => {
  const { data } = await api.put(`/management/locations/${id}`, location);
  return data;
};

export const deleteLocation = async (id) => {
  const { data } = await api.delete(`/management/locations/${id}`);
  return data;
};
