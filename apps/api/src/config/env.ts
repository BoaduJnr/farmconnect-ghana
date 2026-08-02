import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';

// Resolve the monorepo root .env regardless of which directory the process is
// launched from (npm workspace scripts run with cwd = the package directory,
// e.g. apps/api, not the repo root).
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, '../../../../');
loadDotenv({ path: path.join(repoRoot, '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  OTP_TTL_SECONDS: z.coerce.number().default(300),

  GEMINI_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
  // Outbound SMS only (OTPs, order notifications, inbound-command replies) — see
  // notifications/sms.service.ts. The inbound SMS command gateway (sms-gateway module) is a
  // separate concern: it's just an unauthenticated webhook endpoint, so it needs no API key
  // here — whichever provider receives the farmer/buyer's text (e.g. Africa's Talking) is
  // configured on that provider's own dashboard to POST to /api/sms/inbound.
  GIANTSMS_API_TOKEN: z.string().optional(),
  GIANTSMS_SENDER_ID: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration — check your .env file against .env.example');
}

export const env = parsed.data;
