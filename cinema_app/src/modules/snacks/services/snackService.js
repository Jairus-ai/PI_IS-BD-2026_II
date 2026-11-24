import { api } from '../../../services/api'

export const getSnacks = async (page = 1, filters = {}) => {
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([_,value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const { data } = await api.get('/management/snacks/', {
      params: {
        page,
        ...cleanedFilters,
    },
  });
  return data;
};

export const getSnackById = async (id) => {
  const { data } = await api.get(`/management/snacks/${id}`);
  return data;
};


export const getSnacksCount = async (filters = {}) => {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    const { data } = await api.get('/management/snacks/count', { params: cleanedFilters });
    return data;
};

export const createSnack = async (snack) => {
  const { data } = await api.post('/management/snacks', snack);
  return data;
};

export const updateSnack = async (id, snack) => {
  const { data } = await api.put(`/management/snacks/${id}`, snack);
  return data;
};

export const deleteSnack = async (id) => {
  const { data } = await api.delete(`/management/snacks/${id}`);
  return data;
};
