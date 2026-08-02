import { z } from 'zod';

export const CROP_CATEGORY_KEYS = ['grains', 'veg', 'fruits', 'tubers'] as const;
export const cropCategorySchema = z.enum(CROP_CATEGORY_KEYS);
export type CropCategory = z.infer<typeof cropCategorySchema>;

const CROP_KEYS = [
  'maize',
  'rice',
  'tomatoes',
  'pepper',
  'onions',
  'yam',
  'cassava',
  'plantain',
  'soybean',
  'cocoa',
] as const;

export const cropTypeSchema = z.enum(CROP_KEYS);
export type CropType = z.infer<typeof cropTypeSchema>;

interface CropMeta {
  emoji: string;
  category: CropCategory;
  en: string;
  tw: string;
}

/** Single source of truth for crop metadata — reused by the shared zod schema, the API's
 * category filter, and the web app's display labels/emoji (originally lifted from the
 * Figma Make prototype's cropMeta/crops tables). */
export const CROPS: Record<CropType, CropMeta> = {
  maize: { emoji: '🌽', category: 'grains', en: 'Maize', tw: 'Aburoo' },
  rice: { emoji: '🌾', category: 'grains', en: 'Rice', tw: 'Ɛmo' },
  soybean: { emoji: '🫘', category: 'grains', en: 'Soybean', tw: 'Soya' },
  cocoa: { emoji: '🫛', category: 'grains', en: 'Cocoa', tw: 'Kookoɔ' },
  tomatoes: { emoji: '🍅', category: 'veg', en: 'Tomatoes', tw: 'Ntoosi' },
  pepper: { emoji: '🌶️', category: 'veg', en: 'Pepper', tw: 'Mako' },
  onions: { emoji: '🧅', category: 'veg', en: 'Onions', tw: 'Gyeene' },
  yam: { emoji: '🍠', category: 'tubers', en: 'Yam', tw: 'Bayerɛ' },
  cassava: { emoji: '🥔', category: 'tubers', en: 'Cassava', tw: 'Bankye' },
  plantain: { emoji: '🍌', category: 'fruits', en: 'Plantain', tw: 'Brɔdeɛ' },
};
