import { prisma } from '../../lib/prisma.js';

export function createSnapshot(cropType: string, pricePerKg: number) {
  return prisma.priceSnapshot.create({ data: { cropType, pricePerKg } });
}

/** Ordered newest-first; the service groups by crop and takes the first two per crop to
 * compute a change% without needing a "top N per group" SQL query for just 10 crops. */
export function listRecentSnapshots(limit: number) {
  return prisma.priceSnapshot.findMany({
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
}

export function findLatestByCrop(cropType: string) {
  return prisma.priceSnapshot.findFirst({
    where: { cropType },
    orderBy: { recordedAt: 'desc' },
  });
}
