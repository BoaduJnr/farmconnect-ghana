/** Approximate city-center coordinates — used only by the SMS fallback's LIST command, where
 * a feature phone has no GPS to attach to a listing. The app itself uses real device GPS
 * (see plan section 8 / listings module); this is a deliberately rough stand-in for that one
 * text-only channel. */
export const GHANA_REGION_COORDS: Record<string, { lat: number; lng: number }> = {
  accra: { lat: 5.6037, lng: -0.187 },
  kumasi: { lat: 6.6885, lng: -1.6244 },
  tamale: { lat: 9.4008, lng: -0.8393 },
  takoradi: { lat: 4.8845, lng: -1.7554 },
  'cape coast': { lat: 5.1053, lng: -1.2466 },
  ho: { lat: 6.6009, lng: 0.4713 },
  koforidua: { lat: 6.0941, lng: -0.2591 },
  sunyani: { lat: 7.3399, lng: -2.3269 },
  bolgatanga: { lat: 10.7856, lng: -0.8514 },
  wa: { lat: 10.0601, lng: -2.5099 },
};

export function findRegionCoords(regionLabel: string): { lat: number; lng: number } | null {
  return GHANA_REGION_COORDS[regionLabel.trim().toLowerCase()] ?? null;
}
