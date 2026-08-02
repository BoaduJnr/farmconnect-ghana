import {
  type CreateOrderInput,
  type DisputeResolution,
  OrderStatus,
  type RaiseDisputeInput,
  type RejectPaymentInput,
  type ResolveDisputeInput,
  type SubmitPaymentInput,
} from '@farmconnect/shared';
import * as listingsRepository from '../listings/listings.repository.js';
import * as notificationsService from '../notifications/notifications.service.js';
import { findAdminUsers, findUserById } from '../users/users.repository.js';
import * as ordersRepository from './orders.repository.js';

const DELIVERY_FEE_GHS = 15;

export class ListingNotAvailableError extends Error {
  constructor() {
    super('This listing is not currently available for order');
    this.name = 'ListingNotAvailableError';
  }
}

export class QuantityExceedsListingError extends Error {
  constructor() {
    super('Requested quantity exceeds what the listing has available');
    this.name = 'QuantityExceedsListingError';
  }
}

export class FarmerMomoNotSetupError extends Error {
  constructor() {
    super('This farmer has not linked Mobile Money payout details yet');
    this.name = 'FarmerMomoNotSetupError';
  }
}

export class OrderNotFoundError extends Error {
  constructor() {
    super('Order not found');
    this.name = 'OrderNotFoundError';
  }
}

export class ForbiddenOrderAccessError extends Error {
  constructor() {
    super('You do not have access to this order');
    this.name = 'ForbiddenOrderAccessError';
  }
}

export class InvalidOrderStateError extends Error {
  constructor(message = 'This order is not in a state that allows that action') {
    super(message);
    this.name = 'InvalidOrderStateError';
  }
}

function serializeOrder(order: {
  id: string;
  listingId: string;
  buyerId: string;
  farmerId: string;
  cropType: string;
  quantityKg: number;
  pricePerKg: unknown;
  subtotal: unknown;
  deliveryFee: unknown;
  total: unknown;
  status: string;
  sellerMomoProvider: string;
  sellerMomoPhone: string;
  sellerMomoAccountName: string;
  buyerMomoPhone: string | null;
  transactionId: string | null;
  paymentSubmittedAt: Date | null;
  paymentRejectedNote: string | null;
  paidConfirmedAt: Date | null;
  deliveryConfirmedAt: Date | null;
  disputeReason: string | null;
  disputeRaisedAt: Date | null;
  disputeResolution: string | null;
  disputeResolvedNote: string | null;
  disputeResolvedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: order.id,
    listingId: order.listingId,
    buyerId: order.buyerId,
    farmerId: order.farmerId,
    cropType: order.cropType,
    quantityKg: order.quantityKg,
    pricePerKg: Number(order.pricePerKg),
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    status: order.status,
    sellerMomoProvider: order.sellerMomoProvider,
    sellerMomoPhone: order.sellerMomoPhone,
    sellerMomoAccountName: order.sellerMomoAccountName,
    buyerMomoPhone: order.buyerMomoPhone,
    transactionId: order.transactionId,
    paymentSubmittedAt: order.paymentSubmittedAt,
    paymentRejectedNote: order.paymentRejectedNote,
    paidConfirmedAt: order.paidConfirmedAt,
    deliveryConfirmedAt: order.deliveryConfirmedAt,
    disputeReason: order.disputeReason,
    disputeRaisedAt: order.disputeRaisedAt,
    disputeResolution: order.disputeResolution,
    disputeResolvedNote: order.disputeResolvedNote,
    disputeResolvedAt: order.disputeResolvedAt,
    createdAt: order.createdAt,
  };
}

export async function createOrder(buyerId: string, input: CreateOrderInput) {
  const listing = await listingsRepository.findListingById(input.listingId);
  if (!listing || listing.status !== 'ACTIVE') {
    throw new ListingNotAvailableError();
  }
  if (input.quantityKg > listing.quantityKg) {
    throw new QuantityExceedsListingError();
  }
  if (!listing.farmer.momoProvider || !listing.farmer.momoPhone || !listing.farmer.momoAccountName) {
    throw new FarmerMomoNotSetupError();
  }

  const pricePerKg = Number(listing.pricePerKg);
  const subtotal = Math.round(input.quantityKg * pricePerKg * 100) / 100;
  const total = Math.round((subtotal + DELIVERY_FEE_GHS) * 100) / 100;

  const order = await ordersRepository.createOrder({
    listingId: listing.id,
    buyerId,
    farmerId: listing.farmerId,
    cropType: listing.cropType,
    quantityKg: input.quantityKg,
    pricePerKg,
    subtotal,
    deliveryFee: DELIVERY_FEE_GHS,
    total,
    sellerMomoProvider: listing.farmer.momoProvider,
    sellerMomoPhone: listing.farmer.momoPhone,
    sellerMomoAccountName: listing.farmer.momoAccountName,
  });

  await listingsRepository.updateListing(listing.id, { status: 'PENDING' });

  await notificationsService.notify({
    userId: order.farmerId,
    phone: listing.farmer.phone,
    type: 'ORDER',
    title: 'New order',
    body: `A buyer wants to buy ${order.quantityKg}kg of ${order.cropType} (₵${Number(order.total).toFixed(2)}). Waiting for their payment.`,
    sms: true,
  });

  return serializeOrder(order);
}

export async function listMine(userId: string, role: 'FARMER' | 'BUYER') {
  const orders =
    role === 'FARMER'
      ? await ordersRepository.findOrdersByFarmer(userId)
      : await ordersRepository.findOrdersByBuyer(userId);
  return orders.map(serializeOrder);
}

export async function getById(orderId: string, userId: string) {
  const order = await ordersRepository.findOrderById(orderId);
  if (!order) {
    throw new OrderNotFoundError();
  }
  if (order.buyerId !== userId && order.farmerId !== userId) {
    throw new ForbiddenOrderAccessError();
  }
  return serializeOrder(order);
}

async function requireOwnedOrder(orderId: string, userId: string, side: 'buyer' | 'farmer') {
  const order = await ordersRepository.findOrderById(orderId);
  if (!order) {
    throw new OrderNotFoundError();
  }
  const ownerId = side === 'buyer' ? order.buyerId : order.farmerId;
  if (ownerId !== userId) {
    throw new ForbiddenOrderAccessError();
  }
  return order;
}

/** Buyer submits proof of a manual Mobile Money transfer they made directly to the seller. */
export async function submitPayment(orderId: string, buyerId: string, input: SubmitPaymentInput) {
  const order = await requireOwnedOrder(orderId, buyerId, 'buyer');
  if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PAYMENT_REJECTED) {
    throw new InvalidOrderStateError('Payment can only be submitted for a pending or rejected order');
  }

  const updated = await ordersRepository.updateOrder(orderId, {
    status: OrderStatus.PAYMENT_SUBMITTED,
    buyerMomoPhone: input.buyerMomoPhone,
    transactionId: input.transactionId,
    paymentSubmittedAt: new Date(),
    paymentRejectedNote: null,
  });

  const farmer = await findUserById(order.farmerId);
  await notificationsService.notify({
    userId: order.farmerId,
    phone: farmer?.phone,
    type: 'ORDER',
    title: 'Payment submitted',
    body: `A buyer submitted a Mobile Money payment for your ${order.cropType} order (₵${Number(order.total).toFixed(2)}). Check your MoMo history and confirm in the app.`,
    sms: true,
  });

  return serializeOrder(updated);
}

/** Seller checks the submitted transaction ID against their own Mobile Money history and confirms it. */
export async function confirmPayment(orderId: string, farmerId: string) {
  const order = await requireOwnedOrder(orderId, farmerId, 'farmer');
  if (order.status !== OrderStatus.PAYMENT_SUBMITTED) {
    throw new InvalidOrderStateError('Only a submitted payment can be confirmed');
  }

  const updated = await ordersRepository.updateOrder(orderId, {
    status: OrderStatus.PAID,
    paidConfirmedAt: new Date(),
  });

  const buyer = await findUserById(order.buyerId);
  await notificationsService.notify({
    userId: order.buyerId,
    phone: buyer?.phone,
    type: 'ORDER',
    title: 'Payment confirmed',
    body: `The farmer confirmed your payment for ${order.cropType}. They'll prepare your order for delivery.`,
    sms: true,
  });

  return serializeOrder(updated);
}

/** Seller says the submitted transaction ID/amount doesn't check out — buyer can resubmit. */
export async function rejectPayment(orderId: string, farmerId: string, input: RejectPaymentInput) {
  const order = await requireOwnedOrder(orderId, farmerId, 'farmer');
  if (order.status !== OrderStatus.PAYMENT_SUBMITTED) {
    throw new InvalidOrderStateError('Only a submitted payment can be rejected');
  }

  const updated = await ordersRepository.updateOrder(orderId, {
    status: OrderStatus.PAYMENT_REJECTED,
    paymentRejectedNote: input.note ?? null,
  });

  const buyer = await findUserById(order.buyerId);
  await notificationsService.notify({
    userId: order.buyerId,
    phone: buyer?.phone,
    type: 'ORDER',
    title: 'Payment not confirmed',
    body: input.note
      ? `The farmer couldn't confirm your payment for ${order.cropType}: ${input.note}. Please check and resend.`
      : `The farmer couldn't confirm your payment for ${order.cropType}. Please check and resend.`,
    sms: true,
  });

  return serializeOrder(updated);
}

/** Buyer disputes a farmer's rejection — the only structural point a payment disagreement can
 * arise given there's no gateway to arbitrate automatically. An admin resolves it (FR-13). */
export async function raiseDispute(orderId: string, buyerId: string, input: RaiseDisputeInput) {
  const order = await requireOwnedOrder(orderId, buyerId, 'buyer');
  if (order.status !== OrderStatus.PAYMENT_REJECTED) {
    throw new InvalidOrderStateError('Only a rejected payment can be disputed');
  }

  const updated = await ordersRepository.updateOrder(orderId, {
    status: OrderStatus.DISPUTED,
    disputeReason: input.reason,
    disputeRaisedAt: new Date(),
  });

  const admins = await findAdminUsers();
  await Promise.all(
    admins.map((admin) =>
      notificationsService.notify({
        userId: admin.id,
        phone: admin.phone,
        type: 'ORDER',
        title: 'Payment dispute raised',
        body: `A buyer disputed a payment rejection for ${order.cropType} (₵${Number(order.total).toFixed(2)}) — needs review.`,
        sms: true,
      }),
    ),
  );

  return serializeOrder(updated);
}

/** Admin resolution of a disputed order (FR-13) — siding with the buyer's claim of payment, or
 * with the farmer's rejection. Not exposed to buyer/farmer routes; called from the admin module. */
export async function resolveDispute(
  orderId: string,
  resolution: DisputeResolution,
  note: ResolveDisputeInput['note'],
) {
  const order = await ordersRepository.findOrderById(orderId);
  if (!order) {
    throw new OrderNotFoundError();
  }
  if (order.status !== OrderStatus.DISPUTED) {
    throw new InvalidOrderStateError('Only a disputed order can be resolved');
  }

  const upheldPayment = resolution === 'uphold_payment';
  const updated = await ordersRepository.updateOrder(orderId, {
    status: upheldPayment ? OrderStatus.PAID : OrderStatus.CANCELLED,
    disputeResolution: resolution,
    disputeResolvedNote: note ?? null,
    disputeResolvedAt: new Date(),
    ...(upheldPayment ? { paidConfirmedAt: new Date() } : {}),
  });

  if (!upheldPayment) {
    await listingsRepository.updateListing(order.listingId, { status: 'ACTIVE' });
  }

  const buyer = await findUserById(order.buyerId);
  const farmer = await findUserById(order.farmerId);
  const resolutionText = upheldPayment
    ? `An admin reviewed your dispute for ${order.cropType} and confirmed your payment.`
    : `An admin reviewed your dispute for ${order.cropType} and upheld the farmer's rejection.`;
  await notificationsService.notify({
    userId: order.buyerId,
    phone: buyer?.phone,
    type: 'ORDER',
    title: 'Dispute resolved',
    body: resolutionText,
    sms: true,
  });
  await notificationsService.notify({
    userId: order.farmerId,
    phone: farmer?.phone,
    type: 'ORDER',
    title: 'Dispute resolved',
    body: upheldPayment
      ? `An admin reviewed the payment dispute for ${order.cropType} and confirmed the buyer's payment.`
      : `An admin reviewed the payment dispute for ${order.cropType} and upheld your rejection — the listing is active again.`,
    sms: true,
  });

  return serializeOrder(updated);
}

export async function confirmDelivery(orderId: string, buyerId: string) {
  const order = await requireOwnedOrder(orderId, buyerId, 'buyer');
  if (order.status !== OrderStatus.PAID) {
    throw new InvalidOrderStateError('Only a paid order can be confirmed as delivered');
  }

  const updated = await ordersRepository.updateOrder(orderId, {
    status: OrderStatus.DELIVERED,
    deliveryConfirmedAt: new Date(),
  });
  await listingsRepository.updateListing(order.listingId, { status: 'SOLD' });

  const farmer = await findUserById(order.farmerId);
  await notificationsService.notify({
    userId: order.farmerId,
    phone: farmer?.phone,
    type: 'ORDER',
    title: 'Order complete',
    body: `The buyer confirmed delivery of your ${order.cropType} — sale complete!`,
    sms: true,
  });

  return serializeOrder(updated);
}

export async function cancelOrder(orderId: string, buyerId: string) {
  const order = await requireOwnedOrder(orderId, buyerId, 'buyer');
  if (order.status !== OrderStatus.PENDING) {
    throw new InvalidOrderStateError('Only an order awaiting payment can be cancelled');
  }

  const updated = await ordersRepository.updateOrder(orderId, { status: OrderStatus.CANCELLED });
  await listingsRepository.updateListing(order.listingId, { status: 'ACTIVE' });
  return serializeOrder(updated);
}
