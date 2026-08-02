import type { CropType, ListingStatus, MomoProvider } from '@farmconnect/shared';

export interface Listing {
  id: string;
  cropType: CropType;
  emoji: string;
  quantityKg: number;
  pricePerKg: number;
  harvestDate: string | null;
  availableFrom: string;
  photos: string[];
  lat: number;
  lng: number;
  regionLabel: string;
  status: ListingStatus;
  createdAt: string;
  farmerId: string;
  coop: { id: string; name: string } | null;
}

interface FarmerSummary {
  id: string;
  name: string;
  trustScore: number;
  ratingCount: number;
  isVerified: boolean;
}

export interface ListingSearchResult extends Listing {
  farmer: FarmerSummary;
  distanceKm: number | null;
}

export interface ListingWithFarmer extends Listing {
  farmer: FarmerSummary & {
    // Only present on the single-listing detail response — buyers need this to send Mobile
    // Money directly to the seller (no payment gateway). Search results omit it.
    momoProvider: MomoProvider | null;
    momoPhone: string | null;
    momoAccountName: string | null;
  };
}

export interface SearchListingsResponse {
  results: ListingSearchResult[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateListingPayload {
  cropType: CropType;
  quantityKg: number;
  pricePerKg: number;
  harvestDate?: string;
  photos: string[];
  lat: number;
  lng: number;
  regionLabel: string;
  sellAsCoop?: boolean;
}
