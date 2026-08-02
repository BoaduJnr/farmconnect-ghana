import { prisma } from '../../lib/prisma.js';

export function create(userId: string, type: 'ORDER' | 'PRICE' | 'SYSTEM', title: string, body: string) {
  return prisma.notification.create({ data: { userId, type, title, body } });
}

export function listByUser(userId: string) {
  return prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
}

export function markRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export function countUnread(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}
