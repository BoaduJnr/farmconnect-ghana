import { CROPS, type CropType } from '@farmconnect/shared';

export function cropEmoji(cropType: CropType): string {
  return CROPS[cropType]?.emoji ?? '🌱';
}

export function cropName(cropType: CropType, lang: string): string {
  const meta = CROPS[cropType];
  if (!meta) return cropType;
  return lang === 'tw' ? meta.tw : meta.en;
}
