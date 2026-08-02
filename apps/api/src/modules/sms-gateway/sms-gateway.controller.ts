import type { Request, Response } from 'express';
import { logger } from '../../lib/logger.js';
import { sendSms } from '../notifications/sms.service.js';
import { handleInboundSms } from './sms-gateway.service.js';

/** Africa's Talking posts inbound SMS as form-encoded fields: from, to, text, date, id.
 * We reply by sending a new outbound SMS back to the sender (the gateway doesn't relay a
 * synchronous response body to the farmer/buyer's phone). */
export async function inbound(req: Request, res: Response) {
  const from = String(req.body.from ?? '');
  const text = String(req.body.text ?? '');

  const reply = await handleInboundSms(from, text);

  try {
    await sendSms(from, reply);
  } catch (err) {
    logger.error({ err }, '[sms-gateway] failed to send reply SMS');
  }

  res.status(200).json({ reply });
}
