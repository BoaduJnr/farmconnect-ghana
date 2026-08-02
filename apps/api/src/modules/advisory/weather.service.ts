import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { redis } from '../../lib/redis.js';

const isConfigured = Boolean(env.WEATHER_API_KEY);
const CACHE_TTL_SECONDS = 45 * 60;

export interface WeatherSnapshot {
  locationName: string;
  tempC: number;
  description: string;
  humidityPct: number;
  windSpeedMs: number;
}

function cacheKey(lat: number, lng: number): string {
  // Rounded to ~1km precision — plenty for "what's the weather like today" context, and it
  // means nearby requests within the cache window share a cached lookup instead of each
  // farmer/buyer burning a fresh API call.
  return `weather:${lat.toFixed(2)}:${lng.toFixed(2)}`;
}

/** Returns null (rather than throwing) when no WEATHER_API_KEY is configured or the call
 * fails — the advisory chatbot degrades gracefully to giving advice without weather context
 * instead of blocking the whole conversation on a non-essential API. */
export async function getWeather(lat: number, lng: number): Promise<WeatherSnapshot | null> {
  if (!isConfigured) {
    logger.warn('[weather] WEATHER_API_KEY not configured — advisory chat will skip weather context');
    return null;
  }

  const key = cacheKey(lat, lng);
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as WeatherSnapshot;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${env.WEATHER_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OpenWeatherMap responded ${res.status}`);
    }
    const data = (await res.json()) as {
      name: string;
      main: { temp: number; humidity: number };
      weather: { description: string }[];
      wind: { speed: number };
    };

    const snapshot: WeatherSnapshot = {
      locationName: data.name || 'your area',
      tempC: Math.round(data.main.temp),
      description: data.weather[0]?.description ?? 'unknown',
      humidityPct: data.main.humidity,
      windSpeedMs: data.wind.speed,
    };

    await redis.set(key, JSON.stringify(snapshot), 'EX', CACHE_TTL_SECONDS);
    return snapshot;
  } catch (err) {
    logger.error({ err }, '[weather] Failed to fetch weather — continuing without it');
    return null;
  }
}
