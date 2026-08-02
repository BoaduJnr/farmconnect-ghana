import { CROPS, type CropType } from '@farmconnect/shared';
import { logger } from '../../lib/logger.js';
import * as pricesRepository from './prices.repository.js';

const BASE_PRICES: Record<CropType, number> = {
  maize: 4.55,
  rice: 7.1,
  tomatoes: 8.0,
  pepper: 12.0,
  onions: 6.0,
  yam: 3.3,
  cassava: 2.05,
  plantain: 5.4,
  soybean: 6.4,
  cocoa: 21.8,
};

export async function ensureSeeded() {
  for (const cropType of Object.keys(BASE_PRICES) as CropType[]) {
    const existing = await pricesRepository.findLatestByCrop(cropType);
    if (!existing) {
      await pricesRepository.createSnapshot(cropType, BASE_PRICES[cropType]);
    }
  }
}

export interface PriceRow {
  cropType: CropType;
  emoji: string;
  price: number;
  changePct: number;
  up: boolean;
  recordedAt: Date;
}

export async function getLatestPrices(): Promise<PriceRow[]> {
  // 10 crops, a handful of ticks per hour — a few hundred rows is a generous recent window
  // for a capstone-scale dataset, cheap to pull and group in JS.
  const rows = await pricesRepository.listRecentSnapshots(500);

  const byCrop = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byCrop.get(row.cropType) ?? [];
    list.push(row);
    byCrop.set(row.cropType, list);
  }

  const results: PriceRow[] = [];
  for (const [cropType, snapshots] of byCrop) {
    const [latest, previous] = snapshots;
    const price = Number(latest.pricePerKg);
    const prevPrice = previous ? Number(previous.pricePerKg) : price;
    const changePct = prevPrice === 0 ? 0 : ((price - prevPrice) / prevPrice) * 100;

    results.push({
      cropType: cropType as CropType,
      emoji: CROPS[cropType as CropType]?.emoji ?? '🌱',
      price,
      changePct: Math.round(changePct * 10) / 10,
      up: changePct >= 0,
      recordedAt: latest.recordedAt,
    });
  }

  return results.sort((a, b) => a.cropType.localeCompare(b.cropType));
}

/** Nudges every crop's price by up to ±3% and records a new snapshot — simulates a "live"
 * feed since no public GCX API actually exists to poll (see plan). Called on an interval
 * from server.ts, never during tests (which only ever call createApp(), not server.ts). */
export async function runPriceTick() {
  for (const cropType of Object.keys(BASE_PRICES) as CropType[]) {
    const latest = await pricesRepository.findLatestByCrop(cropType);
    const current = latest ? Number(latest.pricePerKg) : BASE_PRICES[cropType];
    const drift = 1 + (Math.random() * 0.06 - 0.03);
    const next = Math.max(0.5, Math.round(current * drift * 100) / 100);
    await pricesRepository.createSnapshot(cropType, next);
  }
  logger.info('[prices] tick complete — all crop prices refreshed');
}
