import { api } from '../../../services/api'

export const getDiscounts = async () => 
{
  const { data } = await api.get('/management/discounts');
  return data;
};

export const getDiscountsByID = async (id) => 
{
  const { data } = await api.get(`/management/discounts/${id}`);
  return data;
};

export const getDiscountProducts = async() =>
{
  const {data} = await api.get('/management/discounts/DP');
  return data.data;
}

export const addDiscount = async (discount) =>
{
  const {data} = await api.post(`/management/discounts`, discount);
  return data;
}