import { apiClient } from '../../lib/apiClient';
import type {
  CreateListingPayload,
  Listing,
  ListingWithFarmer,
  SearchListingsResponse,
} from './types';

export async function createListing(payload: CreateListingPayload): Promise<Listing> {
  const { data } = await apiClient.post('/listings', payload);
  return data.listing;
}

export async function getMyListings(): Promise<Listing[]> {
  const { data } = await apiClient.get('/listings/mine');
  return data.listings;
}

export async function getListingById(id: string): Promise<ListingWithFarmer> {
  const { data } = await apiClient.get(`/listings/${id}`);
  return data.listing;
}

export async function removeListing(id: string): Promise<Listing> {
  const { data } = await apiClient.delete(`/listings/${id}`);
  return data.listing;
}

export interface SearchListingsParams {
  q?: string;
  category?: string;
  cropType?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export async function searchListings(params: SearchListingsParams): Promise<SearchListingsResponse> {
  const { data } = await apiClient.get('/listings', { params });
  return data;
}

export async function uploadPhoto(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('photo', file);
  const { data } = await apiClient.post('/uploads/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
