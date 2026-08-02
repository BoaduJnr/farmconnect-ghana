import { prisma } from '../../lib/prisma.js';

export function createCoop(name: string, joinCode: string, leaderId: string) {
  return prisma.coopGroup.create({
    data: {
      name,
      joinCode,
      members: { create: { userId: leaderId, role: 'LEADER' } },
    },
  });
}

export function findByJoinCode(joinCode: string) {
  return prisma.coopGroup.findUnique({ where: { joinCode } });
}

export function findByIdWithMembers(id: string) {
  return prisma.coopGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, phone: true } } },
        orderBy: { joinedAt: 'asc' },
      },
    },
  });
}

export function findMembershipByUser(userId: string) {
  return prisma.coopMember.findUnique({ where: { userId } });
}

export function addMember(coopId: string, userId: string, role: 'LEADER' | 'MEMBER') {
  return prisma.coopMember.create({ data: { coopId, userId, role } });
}

export function removeMember(userId: string) {
  return prisma.coopMember.delete({ where: { userId } });
}

export function promoteToLeader(memberId: string) {
  return prisma.coopMember.update({ where: { id: memberId }, data: { role: 'LEADER' } });
}

export function deleteCoop(id: string) {
  return prisma.coopGroup.delete({ where: { id } });
}

export function countMembers(coopId: string) {
  return prisma.coopMember.count({ where: { coopId } });
}

export function findEarliestOtherMember(coopId: string, excludeUserId: string) {
  return prisma.coopMember.findFirst({
    where: { coopId, userId: { not: excludeUserId } },
    orderBy: { joinedAt: 'asc' },
  });
}
