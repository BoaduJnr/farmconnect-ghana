import { prisma } from '../../lib/prisma.js';

export function listThread(userId: string) {
  return prisma.supportMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
}

export function createMessage(data: {
  userId: string;
  sender: 'USER' | 'ADMIN';
  content: string;
  orderId?: string;
  adminId?: string;
}) {
  return prisma.supportMessage.create({ data });
}

export function markReadByUser(userId: string) {
  return prisma.supportMessage.updateMany({
    where: { userId, sender: 'ADMIN', readByUser: false },
    data: { readByUser: true },
  });
}

export function markReadByAdmin(userId: string) {
  return prisma.supportMessage.updateMany({
    where: { userId, sender: 'USER', readByAdmin: false },
    data: { readByAdmin: true },
  });
}

/** Recent messages across all threads, for the admin inbox — grouped/summarized in the
 * service layer (capstone-scale dataset, cheap to pull and group in JS; same pattern as
 * prices.service.ts's getLatestPrices()). */
export function listRecentForAdmin(limit = 500) {
  return prisma.supportMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { user: { select: { id: true, name: true, phone: true, role: true } } },
  });
}
