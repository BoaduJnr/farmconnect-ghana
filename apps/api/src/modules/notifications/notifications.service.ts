import { logger } from '../../lib/logger.js';
import * as notificationsRepository from './notifications.repository.js';
import { sendSms } from './sms.service.js';

export async function listMine(userId: string) {
  const [rows, unread] = await Promise.all([
    notificationsRepository.listByUser(userId),
    notificationsRepository.countUnread(userId),
  ]);
  return { notifications: rows, unreadCount: unread };
}

export async function markRead(id: string, userId: string) {
  await notificationsRepository.markRead(id, userId);
}

/** Creates the in-app notification and, if a phone + `sms: true` are given, also fires an SMS —
 * best-effort: a failed SMS send never breaks the order transition that triggered it (FR-09). */
export async function notify(params: {
  userId: string;
  phone?: string;
  type: 'ORDER' | 'PRICE' | 'SYSTEM' | 'SUPPORT';
  title: string;
  body: string;
  sms?: boolean;
}) {
  await notificationsRepository.create(params.userId, params.type, params.title, params.body);

  if (params.sms && params.phone) {
    try {
      await sendSms(params.phone, `${params.title}: ${params.body}`);
    } catch (err) {
      logger.error({ err }, '[notifications] SMS send failed — in-app notification still recorded');
    }
  }
}
