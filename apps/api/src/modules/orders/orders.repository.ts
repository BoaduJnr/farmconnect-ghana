import type { MomoProvider, OrderStatus } from '@farmconnect/shared';
import { prisma } from '../../lib/prisma.js';

export function createOrder(data: {
  listingId: string;
  buyerId: string;
  farmerId: string;
  cropType: string;
  quantityKg: number;
  pricePerKg: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  sellerMomoProvider: MomoProvider;
  sellerMomoPhone: string;
  sellerMomoAccountName: string;
}) {
  return prisma.order.create({ data });
}

export function findOrderById(id: string) {
  return prisma.order.findUnique({ where: { id } });
}

export function findOrdersByBuyer(buyerId: string) {
  return prisma.order.findMany({ where: { buyerId }, orderBy: { createdAt: 'desc' } });
}

export function findOrdersByFarmer(farmerId: string) {
  return prisma.order.findMany({ where: { farmerId }, orderBy: { createdAt: 'desc' } });
}

export function updateOrder(
  id: string,
  data: Partial<{
    status: OrderStatus;
    buyerMomoPhone: string;
    transactionId: string;
    paymentSubmittedAt: Date;
    paymentRejectedNote: string | null;
    paidConfirmedAt: Date;
    deliveryConfirmedAt: Date;
    disputeReason: string;
    disputeRaisedAt: Date;
    disputeResolution: 'uphold_payment' | 'uphold_rejection';
    disputeResolvedNote: string | null;
    disputeResolvedAt: Date;
  }>,
) {
  return prisma.order.update({ where: { id }, data });
}

export function findDisputedOrders() {
  return prisma.order.findMany({ where: { status: 'disputed' }, orderBy: { disputeRaisedAt: 'asc' } });
}
