import { prisma } from '../../lib/prisma.js';

export function createMessage(userId: string, role: 'user' | 'assistant', content: string, imageUrl?: string) {
  return prisma.chatMessage.create({ data: { userId, role, content, imageUrl } });
}

export function listRecentMessages(userId: string, limit: number) {
  return prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
