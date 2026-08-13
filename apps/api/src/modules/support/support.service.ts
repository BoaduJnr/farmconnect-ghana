import * as notificationsService from '../notifications/notifications.service.js';
import { findAdminUsers, findUserById } from '../users/users.repository.js';
import * as supportRepository from './support.repository.js';

function serializeMessage(message: {
  id: string;
  sender: string;
  content: string;
  orderId: string | null;
  createdAt: Date;
}) {
  return {
    id: message.id,
    sender: message.sender as 'USER' | 'ADMIN',
    content: message.content,
    orderId: message.orderId,
    createdAt: message.createdAt,
  };
}

/** The calling user's own thread with admin — viewing it marks every admin-sent message read. */
export async function getMyThread(userId: string) {
  const rows = await supportRepository.listThread(userId);
  await supportRepository.markReadByUser(userId);
  return rows.map(serializeMessage);
}

/** `orderId`, when given, tags this message with the transaction it's about — the "complain
 * to admin" chat icon on an order card passes it through. */
export async function sendAsUser(userId: string, content: string, orderId?: string) {
  const message = await supportRepository.createMessage({ userId, sender: 'USER', content, orderId });

  const [admins, user] = await Promise.all([findAdminUsers(), findUserById(userId)]);
  await Promise.all(
    admins.map((admin) =>
      notificationsService.notify({
        userId: admin.id,
        type: 'SUPPORT',
        title: 'New support message',
        body: `${user?.name ?? user?.phone ?? 'A user'}: ${content}`,
      }),
    ),
  );

  return serializeMessage(message);
}

export async function sendAsAdmin(adminId: string, userId: string, content: string) {
  const message = await supportRepository.createMessage({ userId, sender: 'ADMIN', adminId, content });
  // Replying implies the admin has seen the thread up to this point.
  await supportRepository.markReadByAdmin(userId);

  const user = await findUserById(userId);
  if (user) {
    await notificationsService.notify({
      userId: user.id,
      phone: user.phone,
      type: 'SUPPORT',
      title: 'Message from FarmConnect support',
      body: content,
      sms: true,
    });
  }

  return serializeMessage(message);
}

/** Admin inbox: one row per user with an open thread — most-recent message + unread count.
 * Grouped in JS from a bounded recent-messages fetch (capstone-scale dataset — same pattern as
 * prices.service.ts's getLatestPrices()), not a heavier grouped SQL query. */
export async function listInboxForAdmin() {
  const rows = await supportRepository.listRecentForAdmin();

  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  const inbox = [];
  for (const [userId, messages] of byUser) {
    const [latest] = messages;
    const unreadCount = messages.filter((m) => m.sender === 'USER' && !m.readByAdmin).length;
    inbox.push({
      userId,
      userName: latest.user.name,
      userPhone: latest.user.phone,
      userRole: latest.user.role,
      lastMessage: latest.content,
      lastMessageAt: latest.createdAt,
      unreadCount,
    });
  }

  return inbox.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
}

/** Full thread for a specific user, from the admin's side — marks it read by admin. */
export async function getThreadForAdmin(userId: string) {
  const rows = await supportRepository.listThread(userId);
  await supportRepository.markReadByAdmin(userId);
  return rows.map(serializeMessage);
}
