import type { CreateListingInput, ListingStatus } from '@farmconnect/shared';
import { prisma } from '../../lib/prisma.js';

export function createListing(farmerId: string, input: CreateListingInput, coopId: string | null) {
  return prisma.listing.create({
    data: {
      farmerId,
      cropType: input.cropType,
      quantityKg: input.quantityKg,
      pricePerKg: input.pricePerKg,
      harvestDate: input.harvestDate,
      photos: input.photos,
      lat: input.lat,
      lng: input.lng,
      regionLabel: input.regionLabel,
      coopId,
    },
    include: { coop: { select: { id: true, name: true } } },
  });
}

const FARMER_SUMMARY_SELECT = {
  id: true,
  name: true,
  phone: true,
  trustScore: true,
  ratingCount: true,
  isVerified: true,
} as const;

export function findListingById(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: {
      farmer: {
        select: {
          ...FARMER_SUMMARY_SELECT,
          momoProvider: true,
          momoPhone: true,
          momoAccountName: true,
        },
      },
      coop: { select: { id: true, name: true } },
    },
  });
}

export function findListingsByFarmer(farmerId: string) {
  return prisma.listing.findMany({
    where: { farmerId },
    include: { coop: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export function updateListing(
  id: string,
  data: Partial<{
    cropType: string;
    quantityKg: number;
    pricePerKg: number;
    harvestDate: Date;
    photos: string[];
    lat: number;
    lng: number;
    regionLabel: string;
    status: ListingStatus;
  }>,
) {
  return prisma.listing.update({
    where: { id },
    data,
    include: { coop: { select: { id: true, name: true } } },
  });
}

/** For the admin moderation queue — unlike search(), this isn't restricted to ACTIVE listings. */
export function listAllForAdmin(status?: ListingStatus) {
  return prisma.listing.findMany({
    where: status ? { status } : undefined,
    include: { farmer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

interface SearchFilters {
  cropTypes?: string[];
  q?: string;
  minPrice?: number;
  maxPrice?: number;
}

/** Non-geo filtering happens in SQL; distance filtering/sorting happens in the service layer
 * (no PostGIS in this schema — fine at capstone scale, see plan section 8). */
export function searchActiveListings(filters: SearchFilters) {
  return prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      ...(filters.cropTypes && { cropType: { in: filters.cropTypes } }),
      ...(filters.minPrice !== undefined && { pricePerKg: { gte: filters.minPrice } }),
      ...(filters.maxPrice !== undefined && { pricePerKg: { lte: filters.maxPrice } }),
      ...(filters.q && {
        OR: [
          { cropType: { contains: filters.q, mode: 'insensitive' } },
          { regionLabel: { contains: filters.q, mode: 'insensitive' } },
          { farmer: { name: { contains: filters.q, mode: 'insensitive' } } },
        ],
      }),
    },
    include: {
      farmer: { select: FARMER_SUMMARY_SELECT },
      coop: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
