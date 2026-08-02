import { useEffect, useState } from 'react';

const KUMASI_FALLBACK = { lat: 6.6885, lng: -1.6244 };

interface GeoState {
  lat: number;
  lng: number;
  isFallback: boolean;
}

/** Falls back to Kumasi's coordinates when geolocation is denied/unavailable — keeps
 * distance-based search demoable without a hard permission requirement. */
export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({ ...KUMASI_FALLBACK, isFallback: true });

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, isFallback: false }),
      () => setState({ ...KUMASI_FALLBACK, isFallback: true }),
      { timeout: 8000 },
    );
  }, []);

  return state;
}
