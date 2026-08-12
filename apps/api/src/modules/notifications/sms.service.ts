import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

const GIANTSMS_SEND_URL = 'https://api.giantsms.com/api/v1/send';

// The test suite registers dozens of throwaway users via OTP, each of which would otherwise
// trigger a real GiantSMS send to a fake phone number — wasting credits and, worse, throwing
// on a rejected/invalid number and breaking every test that registers a user. Tests always get
// the dev-fallback path, regardless of what's configured in .env.
// Exported so auth.service can decide whether to echo the OTP back in the API response
// (devCode): that's only safe to hide once we've actually handed the code to a real SMS
// gateway — gating it on NODE_ENV alone would silently strand every user on a production
// deployment that (like this capstone's free-tier deploy) has no funded SMS credentials.
export const hasCredentials =
  env.NODE_ENV !== 'test' && Boolean(env.GIANTSMS_API_TOKEN && env.GIANTSMS_SENDER_ID);

interface GiantSmsResponse {
  status: boolean;
  message: string;
  data?: { message_id: string; status: string; reason: string };
}

/** GiantSMS (like most Ghanaian gateways) expects the local 0-prefixed format, not E.164 —
 * our phone numbers are stored as +233XXXXXXXXX everywhere else in the app. */
function toLocalFormat(phone: string): string {
  return phone.replace(/^\+233/, '0');
}

/**
 * Sends an SMS via GiantSMS, or logs to the console when no credentials are configured
 * (local dev / capstone demo without a funded account) — see plan section 4/7. This covers
 * every *outbound* text the app sends (OTP codes, order notifications, replies to inbound SMS
 * commands). It does not cover *receiving* SMS — that's the sms-gateway module's inbound
 * webhook, which GiantSMS's API doesn't support; that side stays on Africa's Talking (or any
 * inbound-capable provider), configured entirely on their dashboard, no code/env changes here.
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  if (!hasCredentials) {
    logger.info(`[dev SMS fallback] to ${phone}: ${message}`);
    return;
  }

  const res = await fetch(GIANTSMS_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${env.GIANTSMS_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.GIANTSMS_SENDER_ID, to: toLocalFormat(phone), msg: message }),
  });

  if (!res.ok) {
    throw new Error(`GiantSMS responded ${res.status}`);
  }

  const data = (await res.json()) as GiantSmsResponse;
  if (!data.status) {
    logger.error({ data }, 'GiantSMS reported a non-success SMS status');
  }
}
