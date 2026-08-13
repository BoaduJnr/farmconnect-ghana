import { apiClient } from '../../lib/apiClient';
import type { SupportInboxEntry, SupportMessage } from './types';

export async function getMyThread(): Promise<SupportMessage[]> {
  const { data } = await apiClient.get('/support/messages');
  return data.messages;
}

export async function sendMessage(content: string, orderId?: string): Promise<SupportMessage> {
  const { data } = await apiClient.post('/support/messages', { content, orderId });
  return data.message;
}

export async function listInboxAdmin(): Promise<SupportInboxEntry[]> {
  const { data } = await apiClient.get('/admin/support');
  return data.inbox;
}

export async function getThreadAdmin(userId: string): Promise<SupportMessage[]> {
  const { data } = await apiClient.get(`/admin/support/${userId}`);
  return data.messages;
}

export async function sendMessageAdmin(userId: string, content: string): Promise<SupportMessage> {
  const { data } = await apiClient.post(`/admin/support/${userId}`, { content });
  return data.message;
}
