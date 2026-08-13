import type { CropType } from '@farmconnect/shared';
import * as cropsService from '../crops/crops.service.js';
import { logger } from '../../lib/logger.js';
import * as pricesRepository from './prices.repository.js';

/** Seeds one initial snapshot per crop from its `basePrice` — crops.service.ensureSeeded()
 * must have already run (see server.ts) so the crop rows themselves exist. Idempotent: only
 * seeds a crop that has no price history yet, so an admin-added crop gets exactly one seed
 * snapshot the first time a tick/request touches it, and existing crops are left alone. */
export async function ensureSeeded() {
  const crops = await cropsService.listAll();
  for (const crop of crops) {
    const existing = await pricesRepository.findLatestByCrop(crop.key);
    if (!existing) {
      await pricesRepository.createSnapshot(crop.key, Number(crop.basePrice));
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
  // A few hundred rows is a generous recent window for a capstone-scale dataset (now ~30
  // crops, a handful of ticks per hour), cheap to pull and group in JS.
  const [rows, cropsByKey] = await Promise.all([
    pricesRepository.listRecentSnapshots(1000),
    cropsService.getByKeyMap(),
  ]);

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
      emoji: cropsByKey.get(cropType)?.emoji ?? '🌱',
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
  const crops = await cropsService.listAll();
  for (const crop of crops) {
    const latest = await pricesRepository.findLatestByCrop(crop.key);
    const current = latest ? Number(latest.pricePerKg) : Number(crop.basePrice);
    const drift = 1 + (Math.random() * 0.06 - 0.03);
    const next = Math.max(0.5, Math.round(current * drift * 100) / 100);
    await pricesRepository.createSnapshot(crop.key, next);
  }
  logger.info('[prices] tick complete — all crop prices refreshed');
}
