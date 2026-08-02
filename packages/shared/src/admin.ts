import { z } from 'zod';
import { ListingStatus, Role } from './enums.js';

/** Admin account verification / suspension (FR-13: "verify buyer/farmer accounts"). */
export const setVerifiedSchema = z.object({
  isVerified: z.boolean(),
});
export type SetVerifiedInput = z.infer<typeof setVerifiedSchema>;

export const setSuspendedSchema = z.object({
  isSuspended: z.boolean(),
});
export type SetSuspendedInput = z.infer<typeof setSuspendedSchema>;

export const adminListUsersQuerySchema = z.object({
  role: z.enum([Role.FARMER, Role.BUYER]).optional(),
});
export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;

export const adminListListingsQuerySchema = z.object({
  status: z.enum([ListingStatus.ACTIVE, ListingStatus.PENDING, ListingStatus.SOLD, ListingStatus.REMOVED]).optional(),
});
export type AdminListListingsQuery = z.infer<typeof adminListListingsQuerySchema>;

/** Admin override of listing status ("suspend or remove fraudulent listings", FR-13) —
 * distinct from a farmer removing their own listing. */
export const adminSetListingStatusSchema = z.object({
  status: z.enum([ListingStatus.ACTIVE, ListingStatus.REMOVED]),
});
export type AdminSetListingStatusInput = z.infer<typeof adminSetListingStatusSchema>;
