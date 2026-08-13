import type { CreateCropInput } from '@farmconnect/shared';
import { Role } from '@farmconnect/shared';
import * as notificationsService from '../notifications/notifications.service.js';
import * as usersRepository from '../users/users.repository.js';
import * as cropsRepository from './crops.repository.js';

export class CropAlreadyExistsError extends Error {
  constructor(key: string) {
    super(`A crop with key "${key}" already exists`);
    this.name = 'CropAlreadyExistsError';
  }
}

export class CropNotFoundError extends Error {
  constructor() {
    super('Crop not found');
    this.name = 'CropNotFoundError';
  }
}

// Curated on request ("extend the list to include as many Ghanaian products as possible") from
// MOFA/FAO/GEPA-sourced crop lists — see Maintenance_and_Evolution.pdf for the research behind
// this. A handful of Twi labels (millet, sorghum, cowpea, sweet potato, garden eggs, avocado,
// cashew) are left in English rather than guessed — flagged there for a Twi-speaking group
// member to fill in with confidence before this goes further. `ayoyo` and `kontomire` use the
// same word in both fields deliberately: that's the common name in both languages.
const SEED_CROPS: {
  key: string;
  emoji: string;
  category: string;
  labelEn: string;
  labelTw: string;
  basePrice: number;
}[] = [
  // grains
  { key: 'maize', emoji: '🌽', category: 'grains', labelEn: 'Maize', labelTw: 'Aburoo', basePrice: 4.55 },
  { key: 'rice', emoji: '🌾', category: 'grains', labelEn: 'Rice', labelTw: 'Ɛmo', basePrice: 7.1 },
  { key: 'millet', emoji: '🌿', category: 'grains', labelEn: 'Millet', labelTw: 'Millet', basePrice: 4.0 },
  { key: 'sorghum', emoji: '🌱', category: 'grains', labelEn: 'Sorghum', labelTw: 'Sorghum', basePrice: 3.8 },
  // legumes
  { key: 'soybean', emoji: '🫘', category: 'legumes', labelEn: 'Soybean', labelTw: 'Soya', basePrice: 6.4 },
  { key: 'groundnut', emoji: '🥜', category: 'legumes', labelEn: 'Groundnut', labelTw: 'Nkatie', basePrice: 9.5 },
  { key: 'cowpea', emoji: '🟤', category: 'legumes', labelEn: 'Cowpea', labelTw: 'Cowpea', basePrice: 7.8 },
  // tubers
  { key: 'yam', emoji: '🍠', category: 'tubers', labelEn: 'Yam', labelTw: 'Bayerɛ', basePrice: 3.3 },
  { key: 'cassava', emoji: '🥔', category: 'tubers', labelEn: 'Cassava', labelTw: 'Bankye', basePrice: 2.05 },
  { key: 'cocoyam', emoji: '🫚', category: 'tubers', labelEn: 'Cocoyam', labelTw: 'Mankani', basePrice: 3.6 },
  {
    key: 'sweetpotato',
    emoji: '🟠',
    category: 'tubers',
    labelEn: 'Sweet Potato',
    labelTw: 'Sweet Potato',
    basePrice: 3.2,
  },
  // veg
  { key: 'tomatoes', emoji: '🍅', category: 'veg', labelEn: 'Tomatoes', labelTw: 'Ntoosi', basePrice: 8.0 },
  { key: 'pepper', emoji: '🌶️', category: 'veg', labelEn: 'Pepper', labelTw: 'Mako', basePrice: 12.0 },
  { key: 'onions', emoji: '🧅', category: 'veg', labelEn: 'Onions', labelTw: 'Gyeene', basePrice: 6.0 },
  { key: 'okra', emoji: '🟢', category: 'veg', labelEn: 'Okra', labelTw: 'Nkruma', basePrice: 7.5 },
  {
    key: 'gardeneggs',
    emoji: '🍆',
    category: 'veg',
    labelEn: 'Garden Eggs',
    labelTw: 'Garden Eggs',
    basePrice: 5.5,
  },
  // leafygreens
  { key: 'kontomire', emoji: '🍃', category: 'leafygreens', labelEn: 'Kontomire', labelTw: 'Kontomire', basePrice: 4.5 },
  { key: 'ayoyo', emoji: '🌿', category: 'leafygreens', labelEn: 'Ayoyo', labelTw: 'Ayoyo', basePrice: 4.0 },
  // fruits
  { key: 'plantain', emoji: '🍌', category: 'fruits', labelEn: 'Plantain', labelTw: 'Brɔdeɛ', basePrice: 5.4 },
  { key: 'banana', emoji: '🟡', category: 'fruits', labelEn: 'Banana', labelTw: 'Kwadu', basePrice: 4.8 },
  { key: 'orange', emoji: '🍊', category: 'fruits', labelEn: 'Orange', labelTw: 'Ankaa', basePrice: 3.5 },
  { key: 'mango', emoji: '🥭', category: 'fruits', labelEn: 'Mango', labelTw: 'Mango', basePrice: 4.2 },
  { key: 'pineapple', emoji: '🍍', category: 'fruits', labelEn: 'Pineapple', labelTw: 'Aborɔbɛ', basePrice: 3.8 },
  { key: 'pawpaw', emoji: '🧡', category: 'fruits', labelEn: 'Pawpaw', labelTw: 'Bɔɔfɛre', basePrice: 3.0 },
  { key: 'avocado', emoji: '🥑', category: 'fruits', labelEn: 'Avocado', labelTw: 'Avocado', basePrice: 6.5 },
  { key: 'coconut', emoji: '🥥', category: 'fruits', labelEn: 'Coconut', labelTw: 'Kube', basePrice: 2.8 },
  // cashcrops
  { key: 'cocoa', emoji: '🫛', category: 'cashcrops', labelEn: 'Cocoa', labelTw: 'Kookoɔ', basePrice: 21.8 },
  { key: 'oilpalm', emoji: '🌴', category: 'cashcrops', labelEn: 'Oil Palm', labelTw: 'Abɛ', basePrice: 9.0 },
  { key: 'cashew', emoji: '🌰', category: 'cashcrops', labelEn: 'Cashew', labelTw: 'Cashew', basePrice: 14.0 },
  { key: 'kolanut', emoji: '🟤', category: 'cashcrops', labelEn: 'Kola Nut', labelTw: 'Bese', basePrice: 10.0 },
];

export async function ensureSeeded() {
  await cropsRepository.createManyIfMissing(SEED_CROPS);
}

export async function listActive() {
  return cropsRepository.findAllActive();
}

/** Admin management view — includes deactivated crops too. */
export async function listAll() {
  return cropsRepository.findAll();
}

/** Keyed lookup for display purposes (emoji/label) — includes inactive crops deliberately, so
 * a listing/order/price row created before a crop was deactivated still renders correctly. */
export async function getByKeyMap() {
  const crops = await cropsRepository.findAll();
  return new Map(crops.map((c) => [c.key, c]));
}

/** Active-only keys — a new listing's cropType must be one of these. */
export async function listActiveKeys(): Promise<Set<string>> {
  const crops = await cropsRepository.findAllActive();
  return new Set(crops.map((c) => c.key));
}

/** All keys (active + inactive) for a category — used by search's category filter, since a
 * deactivated crop's *existing* listings should still show up when browsing that category. */
export async function keysByCategory(category: string): Promise<string[]> {
  const crops = await cropsRepository.findAll();
  return crops.filter((c) => c.category === category).map((c) => c.key);
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
}

export async function create(input: CreateCropInput) {
  const key = input.key ?? slugify(input.labelEn);
  const existing = await cropsRepository.findByKey(key);
  if (existing) {
    throw new CropAlreadyExistsError(key);
  }
  return cropsRepository.create({
    key,
    emoji: input.emoji,
    category: input.category,
    labelEn: input.labelEn,
    labelTw: input.labelTw,
    basePrice: input.basePrice,
  });
}

/** Activating/deactivating a crop changes what farmers can list going forward, so every
 * farmer gets an in-app heads-up (no SMS — this is a catalog change, not urgent). */
export async function setActive(key: string, isActive: boolean) {
  const existing = await cropsRepository.findByKey(key);
  if (!existing) {
    throw new CropNotFoundError();
  }
  const crop = await cropsRepository.setActive(key, isActive);

  const farmers = await usersRepository.listUsers({ role: Role.FARMER });
  await Promise.all(
    farmers.map((farmer) =>
      notificationsService.notify({
        userId: farmer.id,
        type: 'SYSTEM',
        title: isActive ? 'New crop available' : 'Crop no longer available',
        body: isActive
          ? `${crop.labelEn} (${crop.emoji}) can now be listed on FarmConnect.`
          : `${crop.labelEn} (${crop.emoji}) is no longer available for new listings. Existing listings are unaffected.`,
      }),
    ),
  );

  return crop;
}
