import { z } from 'zod';

/** Sent by either a farmer/buyer (to admin) or an admin (to a specific user) — see
 * apps/api/src/modules/support. `orderId` optionally tags the message with the transaction
 * it's about, used by the "complain to admin" chat icon on an order card. */
export const sendSupportMessageSchema = z.object({
  content: z.string().min(1).max(1000),
  orderId: z.string().min(1).optional(),
});
export type SendSupportMessageInput = z.infer<typeof sendSupportMessageSchema>;
