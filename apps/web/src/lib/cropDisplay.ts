import type { CropMeta } from '@farmconnect/shared';

// Crops used to be a hardcoded import; they're DB-backed now (see useCrops()), so callers pass
// the fetched list in. `crops` is undefined/empty while useCrops() is still loading — falls
// back to a generic sprout emoji and the raw key, same as an unrecognized/deactivated crop.
export function cropEmoji(crops: CropMeta[] | undefined, cropType: string): string {
  return crops?.find((c) => c.key === cropType)?.emoji ?? '🌱';
}

export function cropName(crops: CropMeta[] | undefined, cropType: string, lang: string): string {
  const meta = crops?.find((c) => c.key === cropType);
  if (!meta) return cropType;
  return lang === 'tw' ? meta.labelTw : meta.labelEn;
}
