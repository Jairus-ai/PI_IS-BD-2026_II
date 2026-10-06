import { api } from '../../../services/api'

export const getDiscounts = async () => {
  const { data } = await api.get('/management/discounts');
  return data;
};

export const getDiscountsByName = async (name) => {
  const { data } = await api.get(`/discounts/${name}`);
  return data;
};