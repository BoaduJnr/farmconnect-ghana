import { z } from 'zod';

export const CROP_CATEGORY_KEYS = [
  'grains',
  'legumes',
  'tubers',
  'veg',
  'leafygreens',
  'fruits',
  'cashcrops',
] as const;
export const cropCategorySchema = z.enum(CROP_CATEGORY_KEYS);
export type CropCategory = z.infer<typeof cropCategorySchema>;

// CropType used to be a fixed union backed by a hardcoded 10-crop Zod enum. Crops now live in
// the database (see apps/api/src/modules/crops) so an admin can add more without a redeploy --
// this is just a plain string now; validity is checked at runtime against the Crop table
// (crops.service.ts) rather than at parse time. createListingSchema.cropType below reflects
// this: it accepts any non-empty string, and listings.service.ts rejects an unknown key.
export type CropType = string;

/** Shape returned by GET /api/crops and embedded in listing/price API responses. */
export interface CropMeta {
  key: string;
  emoji: string;
  category: CropCategory;
  labelEn: string;
  labelTw: string;
  isActive: boolean;
}

export const cropKeySchema = z
  .string()
  .min(2)
  .max(30)
  .regex(/^[a-z][a-z0-9]*(_[a-z0-9]+)*$/, 'lowercase letters, numbers, and underscores only');
