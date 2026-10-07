import { api } from '../../../services/api'

export const getDiscounts = async () => {
  const { data } = await api.get('/management/discounts');
  return data;
};

export const getDiscountsByName = async (name) => {
  const { data } = await api.get(`/management/discounts/${name}`);
  return data;
};

export const getDiscountsByID = async (id) => {
  const { data } = await api.get(`/management/discounts/${id}`);
  return data;
};

export const addDiscount = async (discount) =>
{

}