import { api } from '../../../services/api'

export const getDiscounts = async (page = 1, filters = {}) => {
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(
      ([_,value]) => value !== '' && value !== null && value !== undefined
    )
  )

  const { data } = await api.get('/management/discounts/', {
      params: {
        page,
        ...cleanedFilters,
    },
  });
  return data;
};

export const getDiscountsCount = async (filters = {}) => {
    const cleanedFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    const { data } = await api.get('/management/discounts/count', { params: cleanedFilters });
    return data;
};

export const getDiscountsByID = async (id) => 
{
  const { data } = await api.get(`/management/discounts/${id}`);
  return data;
};

export const getDiscountProducts = async(type) =>
{
  const {data} = await api.get(`/management/discounts/DP/${encodeURIComponent(type)}`);
  return data.data;
};

export const addDiscount = async (discount,type) =>
{
  const {data} = await api.post(`/management/discounts/${encodeURIComponent(type)}`, discount);
  return data;
};

export const deleteDiscount = async (id) => {
  const {data} = await api.put(`/management/discounts/${id}`);
  return data;
};

export const editDiscount = async (id, discount, type) => {
  const {data} = await api.put(`/management/discounts/EDIT/${id}/${encodeURIComponent(type)}`, discount);
  return data;
};