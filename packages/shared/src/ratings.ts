import { z } from 'zod';

/** Either party on a delivered order rates the other, 1-5 stars (FR-08). */
export const rateOrderSchema = z.object({
  stars: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(300).optional(),
});
export type RateOrderInput = z.infer<typeof rateOrderSchema>;
