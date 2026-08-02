import type { AdminSetListingStatusInput, DisputeResolution, ListingStatus, Role } from '@farmconnect/shared';
import * as listingsRepository from '../listings/listings.repository.js';
import * as notificationsService from '../notifications/notifications.service.js';
import * as ordersRepository from '../orders/orders.repository.js';
import * as ordersService from '../orders/orders.service.js';
import * as usersRepository from '../users/users.repository.js';

function serializeUser(user: {
  id: string;
  phone: string;
  role: string;
  name: string | null;
  trustScore: number;
  ratingCount: number;
  isVerified: boolean;
  isSuspended: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
    trustScore: user.trustScore,
    ratingCount: user.ratingCount,
    isVerified: user.isVerified,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt,
  };
}

export async function listUsers(role?: Role) {
  const users = await usersRepository.listUsers({ role });
  return users.map(serializeUser);
}

export async function setVerified(userId: string, isVerified: boolean) {
  const user = await usersRepository.setVerified(userId, isVerified);
  await notificationsService.notify({
    userId: user.id,
    phone: user.phone,
    type: 'SYSTEM',
    title: isVerified ? 'Account verified' : 'Verification removed',
    body: isVerified
      ? 'An admin verified your account.'
      : 'An admin removed the verified status from your account.',
    sms: true,
  });
  return serializeUser(user);
}

export async function setSuspended(userId: string, isSuspended: boolean) {
  const user = await usersRepository.setSuspended(userId, isSuspended);
  await notificationsService.notify({
    userId: user.id,
    phone: user.phone,
    type: 'SYSTEM',
    title: isSuspended ? 'Account suspended' : 'Account restored',
    body: isSuspended
      ? 'Your account has been suspended. Contact support for help.'
      : 'Your account has been reinstated — you can log in again.',
    sms: true,
  });
  return serializeUser(user);
}

function serializeListing(listing: {
  id: string;
  cropType: string;
  quantityKg: number;
  pricePerKg: unknown;
  status: string;
  regionLabel: string;
  createdAt: Date;
  farmer: { id: string; name: string | null; phone: string };
}) {
  return {
    id: listing.id,
    cropType: listing.cropType,
    quantityKg: listing.quantityKg,
    pricePerKg: Number(listing.pricePerKg),
    status: listing.status,
    regionLabel: listing.regionLabel,
    createdAt: listing.createdAt,
    farmer: listing.farmer,
  };
}

export async function listListings(status?: ListingStatus) {
  const listings = await listingsRepository.listAllForAdmin(status);
  return listings.map(serializeListing);
}

export async function setListingStatus(listingId: string, status: AdminSetListingStatusInput['status']) {
  const listing = await listingsRepository.updateListing(listingId, { status });

  const farmer = await usersRepository.findUserById(listing.farmerId);
  if (farmer) {
    await notificationsService.notify({
      userId: farmer.id,
      phone: farmer.phone,
      type: 'SYSTEM',
      title: status === 'REMOVED' ? 'Listing removed' : 'Listing reactivated',
      body:
        status === 'REMOVED'
          ? `An admin removed your ${listing.cropType} listing. Contact support if you believe this was a mistake.`
          : `Your ${listing.cropType} listing is active again.`,
      sms: true,
    });
  }

  return {
    id: listing.id,
    cropType: listing.cropType,
    quantityKg: listing.quantityKg,
    pricePerKg: Number(listing.pricePerKg),
    status: listing.status,
    regionLabel: listing.regionLabel,
    createdAt: listing.createdAt,
  };
}

export async function listDisputedOrders() {
  const orders = await ordersRepository.findDisputedOrders();
  return orders.map((o) => ({
    id: o.id,
    cropType: o.cropType,
    total: Number(o.total),
    buyerId: o.buyerId,
    farmerId: o.farmerId,
    transactionId: o.transactionId,
    paymentRejectedNote: o.paymentRejectedNote,
    disputeReason: o.disputeReason,
    disputeRaisedAt: o.disputeRaisedAt,
  }));
}

export async function resolveDispute(orderId: string, resolution: DisputeResolution, note?: string) {
  return ordersService.resolveDispute(orderId, resolution, note);
}
