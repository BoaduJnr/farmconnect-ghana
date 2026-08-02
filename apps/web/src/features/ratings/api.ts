import { apiClient } from '../../lib/apiClient';
import type { OrderRatingsResult, Rating } from './types';

export async function getOrderRatings(orderId: string): Promise<OrderRatingsResult> {
  const { data } = await apiClient.get(`/ratings/order/${orderId}`);
  return data;
}

export async function rateOrder(orderId: string, stars: number, comment?: string): Promise<Rating> {
  const { data } = await apiClient.post(`/ratings/order/${orderId}`, { stars, comment });
  return data.rating;
}
