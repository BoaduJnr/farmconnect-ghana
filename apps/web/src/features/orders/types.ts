import type { CropType, MomoProvider, OrderStatus } from '@farmconnect/shared';

export interface Order {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  sellerMomoProvider: MomoProvider;
  sellerMomoPhone: string;
  sellerMomoAccountName: string;
  buyerMomoPhone: string | null;
  transactionId: string | null;
  paymentSubmittedAt: string | null;
  paymentRejectedNote: string | null;
  paidConfirmedAt: string | null;
  deliveryConfirmedAt: string | null;
  disputeReason: string | null;
  disputeRaisedAt: string | null;
  disputeResolution: 'uphold_payment' | 'uphold_rejection' | null;
  disputeResolvedNote: string | null;
  disputeResolvedAt: string | null;
  createdAt: string;
}

export interface CreateOrderPayload {
  listingId: string;
  quantityKg: number;
}

export interface SubmitPaymentPayload {
  buyerMomoPhone: string;
  transactionId: string;
}
