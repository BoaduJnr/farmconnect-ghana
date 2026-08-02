import { z } from 'zod';
import { DisputeResolution, MomoProvider } from './enums.js';
import { phoneSchema } from './schemas.js';

const momoProviderSchema = z.enum([MomoProvider.MTN, MomoProvider.TELECEL, MomoProvider.AIRTELTIGO]);

export const createOrderSchema = z.object({
  listingId: z.string().min(1),
  quantityKg: z.coerce.number().int().positive(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Submitted by the buyer after they've manually sent Mobile Money to the seller. */
export const submitPaymentSchema = z.object({
  buyerMomoPhone: phoneSchema,
  transactionId: z.string().trim().min(3, 'Enter the transaction ID from your Mobile Money SMS').max(60),
});
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;

/** Submitted by the seller when the transaction ID/amount they see doesn't check out. */
export const rejectPaymentSchema = z.object({
  note: z.string().trim().max(300).optional(),
});
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;

export const updateMomoSchema = z.object({
  momoProvider: momoProviderSchema,
  momoPhone: phoneSchema,
  momoAccountName: z.string().trim().min(1, 'Enter the name on the Mobile Money account').max(80),
});
export type UpdateMomoInput = z.infer<typeof updateMomoSchema>;

/** Buyer disputes a farmer's rejection of their submitted payment (FR-13's "resolve disputes
 * raised between transacting parties" — this is the only structural point where a payment
 * disagreement can arise, since there is no payment gateway to arbitrate automatically). */
export const raiseDisputeSchema = z.object({
  reason: z.string().trim().min(3, 'Explain why you believe this payment should be confirmed').max(500),
});
export type RaiseDisputeInput = z.infer<typeof raiseDisputeSchema>;

export const resolveDisputeSchema = z.object({
  resolution: z.enum([DisputeResolution.UPHOLD_PAYMENT, DisputeResolution.UPHOLD_REJECTION]),
  note: z.string().trim().max(500).optional(),
});
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
