import type { Request, Response } from 'express';
import * as cropsService from './crops.service.js';

export async function listActive(_req: Request, res: Response) {
  const crops = await cropsService.listActive();
  res.status(200).json({ crops });
}
