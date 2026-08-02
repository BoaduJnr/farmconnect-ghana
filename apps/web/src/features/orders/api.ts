import { apiClient } from '../../lib/apiClient';
import type { CreateOrderPayload, Order, SubmitPaymentPayload } from './types';

export async function createOrder(payload: CreateOrderPayload): Promise<Order> {
  const { data } = await apiClient.post('/orders', payload);
  return data.order;
}

export async function getMyOrders(): Promise<Order[]> {
  const { data } = await apiClient.get('/orders/mine');
  return data.orders;
}

export async function getOrderById(id: string): Promise<Order> {
  const { data } = await apiClient.get(`/orders/${id}`);
  return data.order;
}

export async function submitPayment(id: string, payload: SubmitPaymentPayload): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/submit-payment`, payload);
  return data.order;
}

export async function confirmPayment(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/confirm-payment`);
  return data.order;
}

export async function rejectPayment(id: string, note?: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/reject-payment`, { note });
  return data.order;
}

export async function raiseDispute(id: string, reason: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/dispute`, { reason });
  return data.order;
}

export async function confirmDelivery(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/confirm-delivery`);
  return data.order;
}

export async function cancelOrder(id: string): Promise<Order> {
  const { data } = await apiClient.post(`/orders/${id}/cancel`);
  return data.order;
}
