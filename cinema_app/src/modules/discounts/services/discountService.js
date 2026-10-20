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

export const getDiscountProducts = async(type) =>
{
  const {data} = await api.get(`/management/discounts/DP/${encodeURIComponent(type)}`);
  return data.data;
}

export const addDiscount = async (discount,type) =>
{
  const {data} = await api.post(`/management/discounts/${encodeURIComponent(type)}`, discount);
  return data;
}