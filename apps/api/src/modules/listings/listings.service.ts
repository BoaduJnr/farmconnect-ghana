import type { CreateListingInput, ListingSearchInput, UpdateListingInput } from '@farmconnect/shared';
import { ListingStatus } from '@farmconnect/shared';
import * as coopsService from '../coops/coops.service.js';
import * as cropsService from '../crops/crops.service.js';
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

export class InvalidCropTypeError extends Error {
  constructor() {
    super('Unknown or unavailable crop type');
    this.name = 'InvalidCropTypeError';
  }
}

function farmerDisplayName(farmer: { name: string | null; phone: string }): string {
  return farmer.name ?? `Farmer •${farmer.phone.slice(-4)}`;
}

function serializeListing(
  listing: {
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
  },
  cropsByKey: Map<string, { emoji: string }>,
) {
  return {
    id: listing.id,
    cropType: listing.cropType,
    emoji: cropsByKey.get(listing.cropType)?.emoji ?? '🌱',
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

  const activeKeys = await cropsService.listActiveKeys();
  if (!activeKeys.has(input.cropType)) {
    throw new InvalidCropTypeError();
  }

  const coopId = input.sellAsCoop ? await coopsService.getMyCoopId(farmerId) : null;
  const listing = await listingsRepository.createListing(farmerId, input, coopId);
  const cropsByKey = await cropsService.getByKeyMap();
  return serializeListing(listing, cropsByKey);
}

export async function listMine(farmerId: string) {
  const [listings, cropsByKey] = await Promise.all([
    listingsRepository.findListingsByFarmer(farmerId),
    cropsService.getByKeyMap(),
  ]);
  return listings.map((l) => serializeListing(l, cropsByKey));
}

export async function getById(id: string) {
  const [listing, cropsByKey] = await Promise.all([
    listingsRepository.findListingById(id),
    cropsService.getByKeyMap(),
  ]);
  if (!listing) {
    throw new ListingNotFoundError();
  }
  return {
    ...serializeListing(listing, cropsByKey),
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
  const cropsByKey = await cropsService.getByKeyMap();
  return serializeListing(updated, cropsByKey);
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
  const cropsByKey = await cropsService.getByKeyMap();
  return serializeListing(updated, cropsByKey);
}

export async function search(params: ListingSearchInput) {
  const cropTypes = params.category
    ? await cropsService.keysByCategory(params.category)
    : params.cropType
      ? [params.cropType]
      : undefined;

  const [rows, cropsByKey] = await Promise.all([
    listingsRepository.searchActiveListings({
      cropTypes,
      q: params.q,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    }),
    cropsService.getByKeyMap(),
  ]);

  let results = rows.map((row) => {
    const base = serializeListing(row, cropsByKey);
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
