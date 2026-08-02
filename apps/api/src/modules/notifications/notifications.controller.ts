import type { Request, Response } from 'express';
import * as notificationsService from './notifications.service.js';

export async function list(req: Request, res: Response) {
  const result = await notificationsService.listMine(req.user!.id);
  res.status(200).json(result);
}

export async function markRead(req: Request, res: Response) {
  await notificationsService.markRead(req.params.id, req.user!.id);
  res.status(204).send();
}
