import {
  CROPS,
  type CreateListingInput,
  type ListingSearchInput,
  ListingStatus,
  type UpdateListingInput,
} from '@farmconnect/shared';
import * as coopsService from '../coops/coops.service.js';
import { haversineDistanceKm } from '../../lib/geo.js';
import { findUserById } from '../users/users.repository.js';
import * as listingsRepository from './listings.repository.js';

export class ListingNotFoundError extends Error {
  constructor() {
    super('Listing not found');
    this.name = 'ListingNotFoundError';
  }
}

export class NotListingOwnerError extends Error {
  constructor() {
    super('You do not own this listing');
    this.name = 'NotListingOwnerError';
  }
}

export class FarmerMomoNotSetupError extends Error {
  constructor() {
    super('Link your Mobile Money payout details before publishing a listing');
    this.name = 'FarmerMomoNotSetupError';
  }
}

function farmerDisplayName(farmer: { name: string | null; phone: string }): string {
  return farmer.name ?? `Farmer •${farmer.phone.slice(-4)}`;
}

function serializeListing(listing: {
  id: string;
  cropType: string;
  quantityKg: number;
  pricePerKg: unknown;
  harvestDate: Date | null;
  availableFrom: Date;
  photos: string[];
  lat: number;
  lng: number;
  regionLabel: string;
  status: string;
  createdAt: Date;
  farmerId: string;
  coop?: { id: string; name: string } | null;
}) {
  return {
    id: listing.id,
    cropType: listing.cropType,
    emoji: CROPS[listing.cropType as keyof typeof CROPS]?.emoji ?? '🌱',
    quantityKg: listing.quantityKg,
    pricePerKg: Number(listing.pricePerKg),
    harvestDate: listing.harvestDate,
    availableFrom: listing.availableFrom,
    photos: listing.photos,
    lat: listing.lat,
    lng: listing.lng,
    regionLabel: listing.regionLabel,
    status: listing.status,
    createdAt: listing.createdAt,
    farmerId: listing.farmerId,
    coop: listing.coop ?? null,
  };
}

export async function create(farmerId: string, input: CreateListingInput) {
  const farmer = await findUserById(farmerId);
  if (!farmer?.momoProvider || !farmer.momoPhone || !farmer.momoAccountName) {
    throw new FarmerMomoNotSetupError();
  }

  const coopId = input.sellAsCoop ? await coopsService.getMyCoopId(farmerId) : null;
  const listing = await listingsRepository.createListing(farmerId, input, coopId);
  return serializeListing(listing);
}

export async function listMine(farmerId: string) {
  const listings = await listingsRepository.findListingsByFarmer(farmerId);
  return listings.map(serializeListing);
}

export async function getById(id: string) {
  const listing = await listingsRepository.findListingById(id);
  if (!listing) {
    throw new ListingNotFoundError();
  }
  return {
    ...serializeListing(listing),
    farmer: {
      id: listing.farmer.id,
      name: farmerDisplayName(listing.farmer),
      trustScore: listing.farmer.trustScore,
      ratingCount: listing.farmer.ratingCount,
      isVerified: listing.farmer.isVerified,
      // Buyer needs these to send Mobile Money directly to the seller (no payment gateway).
      momoProvider: listing.farmer.momoProvider,
      momoPhone: listing.farmer.momoPhone,
      momoAccountName: listing.farmer.momoAccountName,
    },
  };
}

export async function update(id: string, farmerId: string, input: UpdateListingInput) {
  const existing = await listingsRepository.findListingById(id);
  if (!existing) {
    throw new ListingNotFoundError();
  }
  if (existing.farmerId !== farmerId) {
    throw new NotListingOwnerError();
  }

  const updated = await listingsRepository.updateListing(id, input);
  return serializeListing(updated);
}

export async function remove(id: string, farmerId: string) {
  const existing = await listingsRepository.findListingById(id);
  if (!existing) {
    throw new ListingNotFoundError();
  }
  if (existing.farmerId !== farmerId) {
    throw new NotListingOwnerError();
  }

  const updated = await listingsRepository.updateListing(id, { status: ListingStatus.REMOVED });
  return serializeListing(updated);
}

export async function search(params: ListingSearchInput) {
  const cropTypes = params.category
    ? (Object.keys(CROPS) as (keyof typeof CROPS)[]).filter(
        (key) => CROPS[key].category === params.category,
      )
    : params.cropType
      ? [params.cropType]
      : undefined;

  const rows = await listingsRepository.searchActiveListings({
    cropTypes,
    q: params.q,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
  });

  let results = rows.map((row) => {
    const base = serializeListing(row);
    const distanceKm =
      params.lat !== undefined && params.lng !== undefined
        ? haversineDistanceKm({ lat: params.lat, lng: params.lng }, { lat: row.lat, lng: row.lng })
        : null;
    return {
      ...base,
      farmer: {
        id: row.farmer.id,
        name: farmerDisplayName(row.farmer),
        trustScore: row.farmer.trustScore,
        ratingCount: row.farmer.ratingCount,
        isVerified: row.farmer.isVerified,
      },
      distanceKm,
    };
  });

  if (params.radiusKm !== undefined && params.lat !== undefined && params.lng !== undefined) {
    results = results.filter((r) => r.distanceKm !== null && r.distanceKm <= params.radiusKm!);
  }

  if (results.every((r) => r.distanceKm !== null)) {
    results.sort((a, b) => a.distanceKm! - b.distanceKm!);
  }

  const total = results.length;
  const start = (params.page - 1) * params.limit;
  const page = results.slice(start, start + params.limit);

  return { results: page, total, page: params.page, limit: params.limit };
}
