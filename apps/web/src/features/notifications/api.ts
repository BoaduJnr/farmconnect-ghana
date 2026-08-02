import { apiClient } from '../../lib/apiClient';
import type { NotificationsResult } from './types';

export async function getNotifications(): Promise<NotificationsResult> {
  const { data } = await apiClient.get('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}
