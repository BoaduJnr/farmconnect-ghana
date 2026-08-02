import type { Request, Response } from 'express';
import type { SendAdvisoryMessageInput } from '@farmconnect/shared';
import * as advisoryService from './advisory.service.js';
import { GeminiNotConfiguredError } from './gemini.service.js';

function handleKnownErrors(err: unknown, res: Response): boolean {
  if (err instanceof GeminiNotConfiguredError) {
    res.status(503).json({ error: err.message });
    return true;
  }
  return false;
}

export async function getHistory(req: Request, res: Response) {
  const messages = await advisoryService.getHistory(req.user!.id);
  res.status(200).json({ messages });
}

export async function sendMessage(req: Request, res: Response) {
  const { text, lat, lng } = req.body as SendAdvisoryMessageInput;
  try {
    const result = await advisoryService.sendMessage(req.user!.id, text, lat, lng);
    res.status(201).json(result);
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}

export async function sendPhoto(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: 'No photo uploaded (expected multipart field "photo")' });
    return;
  }

  const caption = typeof req.body.caption === 'string' ? req.body.caption : undefined;
  const lat = req.body.lat !== undefined ? Number(req.body.lat) : undefined;
  const lng = req.body.lng !== undefined ? Number(req.body.lng) : undefined;

  try {
    const result = await advisoryService.sendPhoto(req.user!.id, req.file.buffer, caption, lat, lng);
    res.status(201).json(result);
  } catch (err) {
    if (!handleKnownErrors(err, res)) throw err;
  }
}
