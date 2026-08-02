import type { CropType, ListingStatus, Role } from '@farmconnect/shared';

export interface AdminUser {
  id: string;
  phone: string;
  role: Role;
  name: string | null;
  trustScore: number;
  ratingCount: number;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: string;
}

export interface AdminListing {
  id: string;
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  status: ListingStatus;
  regionLabel: string;
  createdAt: string;
  farmer: { id: string; name: string | null; phone: string };
}

export interface AdminDisputedOrder {
  id: string;
  cropType: CropType;
  total: number;
  buyerId: string;
  farmerId: string;
  transactionId: string | null;
  paymentRejectedNote: string | null;
  disputeReason: string | null;
  disputeRaisedAt: string | null;
}
