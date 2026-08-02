import { randomBytes } from 'node:crypto';
import type { CreateCoopInput, JoinCoopInput } from '@farmconnect/shared';
import * as notificationsService from '../notifications/notifications.service.js';
import { findUserById } from '../users/users.repository.js';
import * as coopsRepository from './coops.repository.js';

export class AlreadyInCoopError extends Error {
  constructor() {
    super('You are already in a co-op — leave it first to join or create another');
    this.name = 'AlreadyInCoopError';
  }
}

export class CoopNotFoundError extends Error {
  constructor() {
    super('No co-op found with that join code');
    this.name = 'CoopNotFoundError';
  }
}

export class NotInCoopError extends Error {
  constructor() {
    super('You are not currently in a co-op');
    this.name = 'NotInCoopError';
  }
}

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — avoids ambiguity read aloud

function randomJoinCode(): string {
  const bytes = randomBytes(6);
  let code = '';
  for (const b of bytes) {
    code += JOIN_CODE_ALPHABET[b % JOIN_CODE_ALPHABET.length];
  }
  return code;
}

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomJoinCode();
    const existing = await coopsRepository.findByJoinCode(code);
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique co-op join code — please retry');
}

function serializeCoop(coop: {
  id: string;
  name: string;
  joinCode: string;
  members: { userId: string; role: string; joinedAt: Date; user: { id: string; name: string | null; phone: string } }[];
}, viewerId: string) {
  return {
    id: coop.id,
    name: coop.name,
    joinCode: coop.joinCode,
    myRole: coop.members.find((m) => m.userId === viewerId)?.role ?? null,
    members: coop.members.map((m) => ({
      userId: m.userId,
      name: m.user.name ?? `•${m.user.phone.slice(-4)}`,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  };
}

export async function createCoop(userId: string, input: CreateCoopInput) {
  const existing = await coopsRepository.findMembershipByUser(userId);
  if (existing) {
    throw new AlreadyInCoopError();
  }

  const joinCode = await generateUniqueJoinCode();
  const coop = await coopsRepository.createCoop(input.name, joinCode, userId);
  const full = await coopsRepository.findByIdWithMembers(coop.id);
  return serializeCoop(full!, userId);
}

export async function joinCoop(userId: string, input: JoinCoopInput) {
  const existing = await coopsRepository.findMembershipByUser(userId);
  if (existing) {
    throw new AlreadyInCoopError();
  }

  const coop = await coopsRepository.findByJoinCode(input.joinCode.toUpperCase());
  if (!coop) {
    throw new CoopNotFoundError();
  }

  await coopsRepository.addMember(coop.id, userId, 'MEMBER');
  const full = await coopsRepository.findByIdWithMembers(coop.id);
  const joinerName = full!.members.find((m) => m.userId === userId)?.user.name ?? 'A farmer';
  await Promise.all(
    full!.members
      .filter((m) => m.userId !== userId)
      .map((m) =>
        notificationsService.notify({
          userId: m.userId,
          phone: m.user.phone,
          type: 'SYSTEM',
          title: 'New co-op member',
          body: `${joinerName} joined ${full!.name}.`,
          sms: true,
        }),
      ),
  );
  return serializeCoop(full!, userId);
}

export async function leaveCoop(userId: string) {
  const membership = await coopsRepository.findMembershipByUser(userId);
  if (!membership) {
    throw new NotInCoopError();
  }

  const leavingUser = await findUserById(userId);
  const leavingName = leavingUser?.name ?? 'A member';

  if (membership.role !== 'LEADER') {
    await coopsRepository.removeMember(userId);
    const remaining = await coopsRepository.findByIdWithMembers(membership.coopId);
    if (remaining) {
      await Promise.all(
        remaining.members.map((m) =>
          notificationsService.notify({
            userId: m.userId,
            phone: m.user.phone,
            type: 'SYSTEM',
            title: 'Co-op member left',
            body: `${leavingName} left ${remaining.name}.`,
            sms: true,
          }),
        ),
      );
    }
    return;
  }

  const successor = await coopsRepository.findEarliestOtherMember(membership.coopId, userId);
  if (successor) {
    await coopsRepository.removeMember(userId);
    await coopsRepository.promoteToLeader(successor.id);
    const remaining = await coopsRepository.findByIdWithMembers(membership.coopId);
    if (remaining) {
      const newLeaderName = remaining.members.find((m) => m.userId === successor.userId)?.user.name ?? 'A member';
      await Promise.all(
        remaining.members.map((m) => {
          const isNewLeader = m.userId === successor.userId;
          return notificationsService.notify({
            userId: m.userId,
            phone: m.user.phone,
            type: 'SYSTEM',
            title: isNewLeader ? 'You are now co-op leader' : 'Co-op member left',
            body: isNewLeader
              ? `${leavingName} left ${remaining.name} — you're now the leader.`
              : `${leavingName} left ${remaining.name}. ${newLeaderName} is now the leader.`,
            sms: true,
          });
        }),
      );
    }
    return;
  }

  // Sole member and the leader — the co-op dissolves with them.
  await coopsRepository.removeMember(userId);
  await coopsRepository.deleteCoop(membership.coopId);
}

/** Cheap lookup for other modules (e.g. listings) that only need the co-op ID, not the full
 * member list — used to attribute a new listing to the farmer's co-op if they opt in. */
export async function getMyCoopId(userId: string): Promise<string | null> {
  const membership = await coopsRepository.findMembershipByUser(userId);
  return membership?.coopId ?? null;
}

export async function getMine(userId: string) {
  const membership = await coopsRepository.findMembershipByUser(userId);
  if (!membership) return null;

  const full = await coopsRepository.findByIdWithMembers(membership.coopId);
  return serializeCoop(full!, userId);
}
