import { z } from 'zod';
import { cropCategorySchema, cropKeySchema } from './crops.js';
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

/** Admin adds a new listable crop type (no redeploy needed — see crops.service.ts). `key` is
 * the stable slug other records reference; if omitted, the server derives one from labelEn. */
export const createCropSchema = z.object({
  key: cropKeySchema.optional(),
  emoji: z.string().min(1).max(8),
  category: cropCategorySchema,
  labelEn: z.string().min(1).max(40),
  labelTw: z.string().min(1).max(40),
  basePrice: z.coerce.number().positive(),
});
export type CreateCropInput = z.infer<typeof createCropSchema>;

/** Retiring a crop from the picker/marketplace without deleting historical listings/orders
 * that still reference it. */
export const setCropActiveSchema = z.object({
  isActive: z.boolean(),
});
export type SetCropActiveInput = z.infer<typeof setCropActiveSchema>;
