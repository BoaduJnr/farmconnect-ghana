import type { ListingStatus, Role } from '@farmconnect/shared';
import { apiClient } from '../../lib/apiClient';
import type { AdminDisputedOrder, AdminListing, AdminUser } from './types';

export async function listUsers(role?: Role): Promise<AdminUser[]> {
  const { data } = await apiClient.get('/admin/users', { params: { role } });
  return data.users;
}

export async function setUserVerified(userId: string, isVerified: boolean): Promise<AdminUser> {
  const { data } = await apiClient.post(`/admin/users/${userId}/verify`, { isVerified });
  return data.user;
}

export async function setUserSuspended(userId: string, isSuspended: boolean): Promise<AdminUser> {
  const { data } = await apiClient.post(`/admin/users/${userId}/suspend`, { isSuspended });
  return data.user;
}

export async function listListings(status?: ListingStatus): Promise<AdminListing[]> {
  const { data } = await apiClient.get('/admin/listings', { params: { status } });
  return data.listings;
}

export async function setListingStatus(listingId: string, status: 'ACTIVE' | 'REMOVED'): Promise<AdminListing> {
  const { data } = await apiClient.post(`/admin/listings/${listingId}/status`, { status });
  return data.listing;
}

export async function listDisputedOrders(): Promise<AdminDisputedOrder[]> {
  const { data } = await apiClient.get('/admin/orders/disputed');
  return data.orders;
}

export async function resolveDispute(
  orderId: string,
  resolution: 'uphold_payment' | 'uphold_rejection',
  note?: string,
) {
  const { data } = await apiClient.post(`/admin/orders/${orderId}/resolve-dispute`, { resolution, note });
  return data.order;
}
