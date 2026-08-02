export const Role = {
  FARMER: 'FARMER',
  BUYER: 'BUYER',
  EXTENSION: 'EXTENSION',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Locale = {
  EN: 'en',
  TW: 'tw',
} as const;
export type Locale = (typeof Locale)[keyof typeof Locale];

/**
 * Manual Mobile Money reconciliation state machine — there is no payment gateway. The buyer
 * transfers money directly to the seller's momo number outside the app, then submits a
 * transaction ID for the seller to confirm.
 * pending -> payment_submitted -> paid -> delivered
 * payment_submitted -> payment_rejected -> payment_submitted (buyer can resubmit)
 * payment_rejected -> disputed -> paid | cancelled (buyer disputes a rejection, admin resolves)
 * pending -> cancelled (buyer backs out before sending any money)
 */
export const OrderStatus = {
  PENDING: 'pending',
  PAYMENT_SUBMITTED: 'payment_submitted',
  PAYMENT_REJECTED: 'payment_rejected',
  DISPUTED: 'disputed',
  PAID: 'paid',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

/** How an admin resolves a buyer-raised payment dispute (FR-13) — siding with the buyer's
 * claim that they did pay (order proceeds as paid) or with the farmer's rejection (order is
 * cancelled and the listing quantity reopens). */
export const DisputeResolution = {
  UPHOLD_PAYMENT: 'uphold_payment',
  UPHOLD_REJECTION: 'uphold_rejection',
} as const;
export type DisputeResolution = (typeof DisputeResolution)[keyof typeof DisputeResolution];

export const ListingStatus = {
  ACTIVE: 'ACTIVE',
  PENDING: 'PENDING',
  SOLD: 'SOLD',
  REMOVED: 'REMOVED',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];

/** Ghana's three Mobile Money networks (Telecel is the current brand for what used to be
 * Vodafone Cash). Farmers register their number + network + account name at signup; buyers
 * transfer directly to it and submit a transaction ID for the farmer to confirm. */
export const MomoProvider = {
  MTN: 'mtn',
  TELECEL: 'telecel',
  AIRTELTIGO: 'airteltigo',
} as const;
export type MomoProvider = (typeof MomoProvider)[keyof typeof MomoProvider];
