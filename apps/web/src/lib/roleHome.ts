import { Role } from '@farmconnect/shared';
import type { PublicUser } from '../features/auth/types';

export function hasMomoSetup(user: Pick<PublicUser, 'momoProvider' | 'momoPhone' | 'momoAccountName'>): boolean {
  return Boolean(user.momoProvider && user.momoPhone && user.momoAccountName);
}

/** Where a logged-in user should land — a farmer without Mobile Money details yet is always
 * routed to the forced setup screen first (see plan: momo capture is a separate mandatory
 * step after role selection, not bundled into it). */
export function roleHomePath(user: Pick<PublicUser, 'role' | 'momoProvider' | 'momoPhone' | 'momoAccountName'>): string {
  if (user.role === Role.ADMIN) {
    return '/admin/users';
  }
  if (user.role !== Role.FARMER) {
    return '/buyer/market';
  }
  return hasMomoSetup(user) ? '/farmer/home' : '/farmer/momo-setup';
}
