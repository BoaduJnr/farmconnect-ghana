import type { Request, Response } from 'express';
import type { SendSupportMessageInput } from '@farmconnect/shared';
import * as supportService from './support.service.js';

export async function getMyThread(req: Request, res: Response) {
  const messages = await supportService.getMyThread(req.user!.id);
  res.status(200).json({ messages });
}

export async function sendMessage(req: Request, res: Response) {
  const { content, orderId } = req.body as SendSupportMessageInput;
  const message = await supportService.sendAsUser(req.user!.id, content, orderId);
  res.status(201).json({ message });
}
