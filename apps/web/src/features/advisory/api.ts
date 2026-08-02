import { apiClient } from '../../lib/apiClient';
import type { ChatMessage, SendMessageResult } from './types';

export async function getHistory(): Promise<ChatMessage[]> {
  const { data } = await apiClient.get('/advisory/messages');
  return data.messages;
}

export async function sendMessage(text: string, lat?: number, lng?: number): Promise<SendMessageResult> {
  const { data } = await apiClient.post('/advisory/messages', { text, lat, lng });
  return data;
}

export async function sendPhoto(
  file: File,
  caption?: string,
  lat?: number,
  lng?: number,
): Promise<SendMessageResult> {
  const form = new FormData();
  form.append('photo', file);
  if (caption) form.append('caption', caption);
  if (lat !== undefined) form.append('lat', String(lat));
  if (lng !== undefined) form.append('lng', String(lng));

  const { data } = await apiClient.post('/advisory/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
