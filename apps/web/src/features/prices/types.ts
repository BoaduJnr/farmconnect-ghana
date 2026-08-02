import type { CropType } from '@farmconnect/shared';

export interface PriceRow {
  cropType: CropType;
  emoji: string;
  price: number;
  changePct: number;
  up: boolean;
  recordedAt: string;
}
