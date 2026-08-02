import { z } from 'zod';
import { cropCategorySchema, cropTypeSchema } from './crops.js';
import { ListingStatus } from './enums.js';

const latSchema = z.coerce.number().min(-90).max(90);
const lngSchema = z.coerce.number().min(-180).max(180);

export const createListingSchema = z.object({
  cropType: cropTypeSchema,
  quantityKg: z.coerce.number().int().positive(),
  pricePerKg: z.coerce.number().positive(),
  harvestDate: z.coerce.date().optional(),
  photos: z.array(z.string()).default([]),
  lat: latSchema,
  lng: lngSchema,
  regionLabel: z.string().min(1).max(80),
  // Attributes the listing to the farmer's co-op group (FR-10 aggregated listings) — ignored
  // server-side if the farmer isn't currently in a co-op.
  sellAsCoop: z.boolean().default(false),
});
export type CreateListingInput = z.infer<typeof createListingSchema>;

export const updateListingSchema = createListingSchema
  .partial()
  .extend({ status: z.enum([ListingStatus.ACTIVE, ListingStatus.PENDING, ListingStatus.SOLD, ListingStatus.REMOVED]).optional() });
export type UpdateListingInput = z.infer<typeof updateListingSchema>;

export const listingSearchSchema = z.object({
  cropType: cropTypeSchema.optional(),
  category: cropCategorySchema.optional(),
  q: z.string().max(100).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
  radiusKm: z.coerce.number().positive().max(1000).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
export type ListingSearchInput = z.infer<typeof listingSearchSchema>;
