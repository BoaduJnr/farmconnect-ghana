import { prisma } from '../../lib/prisma.js';

export function findAllActive() {
  return prisma.crop.findMany({ where: { isActive: true }, orderBy: { key: 'asc' } });
}

/** Admin management view — includes deactivated crops too. */
export function findAll() {
  return prisma.crop.findMany({ orderBy: { key: 'asc' } });
}

export function findByKey(key: string) {
  return prisma.crop.findUnique({ where: { key } });
}

export function create(data: {
  key: string;
  emoji: string;
  category: string;
  labelEn: string;
  labelTw: string;
  basePrice: number;
}) {
  return prisma.crop.create({ data });
}

export function setActive(key: string, isActive: boolean) {
  return prisma.crop.update({ where: { key }, data: { isActive } });
}

/** Idempotent — used to seed the curated crop list at startup without clobbering an admin's
 * own edits on repeat boots (only inserts crops that don't already exist by key). */
export function createManyIfMissing(
  rows: { key: string; emoji: string; category: string; labelEn: string; labelTw: string; basePrice: number }[],
) {
  return prisma.crop.createMany({ data: rows, skipDuplicates: true });
}
