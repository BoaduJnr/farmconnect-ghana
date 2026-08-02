import type { Locale, MomoProvider, Role } from '@farmconnect/shared';
import { prisma } from '../../lib/prisma.js';

export function findUserByPhone(phone: string) {
  return prisma.user.findUnique({ where: { phone } });
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function createUser(input: { phone: string; role: Role; locale: Locale; name?: string }) {
  return prisma.user.create({
    data: { phone: input.phone, role: input.role, locale: input.locale, name: input.name },
  });
}

export function setVerified(id: string, isVerified: boolean) {
  return prisma.user.update({ where: { id }, data: { isVerified } });
}

export function setSuspended(id: string, isSuspended: boolean) {
  return prisma.user.update({ where: { id }, data: { isSuspended } });
}

export function listUsers(filter: { role?: Role }) {
  return prisma.user.findMany({
    where: filter.role ? { role: filter.role } : { role: { in: ['FARMER', 'BUYER'] as Role[] } },
    orderBy: { createdAt: 'desc' },
  });
}

/** Every admin account — there's no per-admin assignment/routing of moderation work, so a
 * dispute (or anything else needing admin attention) notifies all of them. */
export function findAdminUsers() {
  return prisma.user.findMany({ where: { role: 'ADMIN' } });
}

export function updateMomo(
  id: string,
  data: { momoProvider: MomoProvider; momoPhone: string; momoAccountName: string },
) {
  return prisma.user.update({ where: { id }, data });
}
