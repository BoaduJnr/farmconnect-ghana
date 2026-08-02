import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

/** Inserts the rating and recomputes the rated user's aggregate trust score/count in one
 * transaction, so a crash between the two steps can never leave them out of sync. */
export function createRatingAndRecompute(data: {
  orderId: string;
  raterId: string;
  ratedId: string;
  stars: number;
  comment?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const rating = await tx.rating.create({ data });
    await recomputeTrustScore(tx, data.ratedId);
    return rating;
  });
}

export function findByOrder(orderId: string) {
  return prisma.rating.findMany({ where: { orderId } });
}

export function findByOrderAndRater(orderId: string, raterId: string) {
  return prisma.rating.findUnique({ where: { orderId_raterId: { orderId, raterId } } });
}

export function findRecentByRatedUser(ratedId: string, take = 20) {
  return prisma.rating.findMany({
    where: { ratedId },
    orderBy: { createdAt: 'desc' },
    take,
    include: { rater: { select: { name: true, phone: true } } },
  });
}

/** Recomputes the rated user's aggregate trust score (simple average) and rating count —
 * run inside the same transaction as the rating insert so the two never drift apart. */
export async function recomputeTrustScore(tx: Prisma.TransactionClient, ratedId: string) {
  const agg = await tx.rating.aggregate({
    where: { ratedId },
    _avg: { stars: true },
    _count: true,
  });
  await tx.user.update({
    where: { id: ratedId },
    data: {
      trustScore: agg._avg.stars ?? 0,
      ratingCount: agg._count,
    },
  });
}
