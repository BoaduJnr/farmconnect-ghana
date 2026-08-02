import { z } from 'zod';

/** Farmers pooling produce listings and negotiating as a unit (FR-10). Kept intentionally
 * simple: a farmer belongs to at most one co-op at a time, joins via a short shareable code. */
export const createCoopSchema = z.object({
  name: z.string().trim().min(2, 'Enter a co-op name').max(80),
});
export type CreateCoopInput = z.infer<typeof createCoopSchema>;

export const joinCoopSchema = z.object({
  joinCode: z.string().trim().min(4).max(12),
});
export type JoinCoopInput = z.infer<typeof joinCoopSchema>;
